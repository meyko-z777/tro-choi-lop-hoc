# Cách chạy: phục vụ trang bằng `python3 -m http.server 8000` ở thư mục gốc kho, rồi
#   python3 kiem-thu/e2e.py http://localhost:8000 <mã phòng> <PIN> <số máy ảo> [--emu] [--wrongpin]
# Kiểm thử đầu-cuối: 1 màn hình lớn + nhiều điện thoại thật (Chromium giả lập điện thoại), kèm máy ảo REST.
# python3 e2e.py BASE ROOM PIN NBOTS [--emu] [--wrongpin]
import asyncio, sys, random, subprocess, time, json, os
from playwright.async_api import async_playwright
BASE, ROOM, PIN, NB = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
EMU = '--emu' in sys.argv
SUF = '&emu=1' if EMU else ''
CH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
OUT = os.path.dirname(os.path.abspath(__file__)) + '/ket-qua'; os.makedirs(OUT, exist_ok=True)
UA = 'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 Zalo android/12100'
PHONES = [('thuong', ''), ('hoi-dinh-ky', '&poll=1'), ('chan-kenh-truc-tiep', ''), ('khong-luu-tru', ''), ('thuong-2', ''), ('vao-muon', '')]
log = lambda *a: print(time.strftime('%H:%M:%S'), *a, flush=True)

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path=CH, args=['--no-sandbox'])
        hc = await br.new_context(viewport={'width': 1600, 'height': 900})
        host = await hc.new_page()
        host.on('pageerror', lambda e: log('HOST LỖI', e))
        await host.goto(f'{BASE}/host.html?g={ROOM}{SUF}')
        await host.wait_for_selector('#pin', state='visible', timeout=30000)
        if '--wrongpin' in sys.argv:
            await host.fill('#pin', '000000'); await host.click('#loginBtn')
            await host.wait_for_function("document.getElementById('loginErr').textContent.length>0", timeout=15000)
            log('PIN sai ->', await host.text_content('#loginErr'))
        await host.fill('#pin', PIN); await host.click('#loginBtn')
        await host.wait_for_function("document.getElementById('login').style.display==='none'", timeout=20000)
        await host.wait_for_function("document.getElementById('lobby').classList.contains('on')", timeout=20000)
        log('Màn hình lớn đã vào, mã phòng', ROOM)
        await host.evaluate("window.__lag=0;let __t=performance.now();setInterval(()=>{const n=performance.now();window.__lag=Math.max(window.__lag,n-__t-200);__t=n},200)")
        host.set_default_timeout(90000)
        bots = None
        if NB:
            bots = subprocess.Popen(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tong-duyet.mjs'), ROOM, str(NB)] + (['--emu'] if EMU else []), stdout=open(f'{OUT}/bots.log', 'w'), stderr=subprocess.STDOUT)
        phones = []
        async def open_phone(name, extra):
            ctx = await br.new_context(viewport={'width': 390, 'height': 780}, user_agent=UA, is_mobile=True, has_touch=True)
            if name == 'chan-kenh-truc-tiep':
                await ctx.route('**/google.firestore.v1.Firestore/Listen/**', lambda r: r.abort())
            if name == 'khong-luu-tru':
                await ctx.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}});Object.defineProperty(window,'indexedDB',{get(){return undefined}});")
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e: log(name, 'LỖI', e))
            await pg.goto(f'{BASE}/?g={ROOM}{SUF}{extra}')
            phones.append((name, pg))
            return pg
        for name, extra in PHONES[:-1]:
            await open_phone(name, extra)
        for name, pg in phones:
            await pg.wait_for_selector('.num', timeout=60000)
            log('Điện thoại', name, 'số', await pg.text_content('.num'), '| kênh:', (await pg.text_content('#conn')).strip())
        if NB:  # chờ máy ảo vào gần đủ
            for _ in range(90):
                n = int(await host.text_content('#nJoin'))
                if n >= NB + len(phones): break
                await asyncio.sleep(1)
        log('Sảnh chờ:', await host.text_content('#nJoin'), 'bạn')
        await host.screenshot(path=f'{OUT}/e2e_lobby.png')
        nq = 6; report = []
        for qi in range(nq):
            await host.keyboard.press('Space')
            await host.wait_for_function(f"document.getElementById('qno').textContent==='CÂU {qi+1}/{nq}' && !document.getElementById('play').classList.contains('rv')", timeout=20000)
            if qi == 1:  # một bạn vào muộn giữa chừng
                lp = await open_phone(*PHONES[-1])
            async def answer(name, pg):
                try:
                    await pg.wait_for_selector('.opt', timeout=15000)
                    await asyncio.sleep(random.uniform(0.5, 4))
                    btns = await pg.query_selector_all('.opt')
                    await btns[random.randrange(len(btns))].click()
                    await pg.wait_for_selector('.rcpt.ok', timeout=15000)
                    return name, 'nhận'
                except Exception as e:
                    txt = (await pg.text_content('#app') or '')[:80]
                    return name, 'LỖI: ' + txt.replace('\n', ' ')
            res = await asyncio.gather(*[answer(n, pg) for n, pg in phones])
            await host.wait_for_function("document.getElementById('play').classList.contains('rv')", timeout=90000)
            await asyncio.sleep(1.5)
            banner = await host.text_content('#banner')
            nans = await host.text_content('#nAns')
            if qi == 0: await host.screenshot(path=f'{OUT}/e2e_q1_reveal.png')
            # điện thoại hiện kết quả
            shown = []
            for n, pg in phones:
                try:
                    await pg.wait_for_function("/Chính xác|Chưa đúng|chưa tính|Xem đáp án/.test(document.getElementById('app').textContent)", timeout=15000)
                    t = await pg.text_content('#app'); shown.append('đúng' if 'Chính xác' in t else 'sai' if 'Chưa đúng' in t else 'khác')
                except Exception: shown.append('KHÔNG HIỆN')
            lag = await host.evaluate('(()=>{const l=window.__lag;window.__lag=0;return Math.round(l)})()')
            await asyncio.sleep(4); nans2 = await host.text_content('#nAns'); cnt = await host.evaluate("[...document.querySelectorAll('#opts .n')].map(e=>e.textContent).join(' | ')")
            log(f'Câu {qi+1}:', dict(res), '| màn hình lớn:', nans, '| đếm sau 4s:', cnt, '| host khựng tối đa', lag, 'ms |', '|', banner.strip(), '| điện thoại:', shown)
            report.append({'q': qi + 1, 'phones': dict(res), 'host': nans, 'shown': shown})
            if qi == 2: await phones[0][1].screenshot(path=f'{OUT}/e2e_phone_result.png')
            await asyncio.sleep(1)
        await host.keyboard.press('Space')
        await host.wait_for_function("document.getElementById('final').classList.contains('on')", timeout=20000)
        await asyncio.sleep(3)
        await host.screenshot(path=f'{OUT}/e2e_final.png')
        for n, pg in phones:
            try:
                await pg.wait_for_function("/Hạng/.test(document.getElementById('app').textContent)", timeout=15000)
                log('Kết thúc', n, (await pg.text_content('#app')).strip()[:60].replace('\n', ' '), '| kênh:', (await pg.text_content('#conn')).strip())
            except Exception: log('Kết thúc', n, 'KHÔNG HIỆN HẠNG')
        await phones[1][1].screenshot(path=f'{OUT}/e2e_phone_end.png')
        if bots: bots.wait(timeout=120)
        json.dump(report, open(f'{OUT}/e2e_report.json', 'w'), ensure_ascii=False, indent=1)
        await br.close()
asyncio.run(main())
