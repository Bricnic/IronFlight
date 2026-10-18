import {test,expect} from '@playwright/test';
import {PARTS} from '../src/damage';
import {ROUTES} from '../src/routes';
test.beforeEach(async({page})=>{await page.goto('/?test=1');await page.waitForFunction(()=>!!window.__game,{},{timeout:5000});});
test('keyboard drives the real truck and restart restores it',async({page})=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.keyboard.down('w');await expect.poll(()=>page.evaluate(()=>window.__game!.snapshot().speed)).toBeGreaterThan(3);await page.keyboard.up('w');await page.keyboard.press('r');expect(await page.evaluate(()=>window.__game!.snapshot().parts.hood.health)).toBe(90);expect(errors).toEqual([]);});
for(const rate of [1,16])for(const route of ROUTES)test(`${route.id} complete browser playthrough at ${rate}x`,async({page},info)=>{
 const result=await page.evaluate(({id,rate})=>{const g=window.__game!;g.select(id);g.pause(true);g.advanceFrames(720/rate,rate,{throttle:1});return g.snapshot();},{id:route.id,rate});
 await info.attach('telemetry',{body:JSON.stringify(result,null,2),contentType:'application/json'});
 expect(result.status).toBe('finished');expect(result.landed).toBe(true);expect(result.airborneTicks).toBeGreaterThan(20);
 await page.screenshot({path:info.outputPath(`${route.id}-${rate}x.png`)});
});
test('browser rejects low speed and bad alignment',async({page})=>{for(const input of [{throttle:.08},{throttle:1,steer:.7}]){const status=await page.evaluate(input=>{const g=window.__game!;g.select('hard');g.pause(true);g.advanceFrames(900,1,input);return g.snapshot().status;},input);expect(status).not.toBe('finished');}});
test('lab individually destroys every rendered physical part',async({page})=>{await page.getByRole('button',{name:'Destruction lab'}).click();for(const part of PARTS){await page.getByRole('button',{name:'Restore truck'}).click();await page.getByLabel('Target part').selectOption(part.id);await page.getByRole('button',{name:'Destroy part',exact:true}).click();const result=await page.evaluate(id=>({state:window.__game!.snapshot().parts[id],visual:window.__game!.visualPart(id)}),part.id);expect(result.state.detached).toBe(true);expect(result.state.health).toBe(0);expect(result.visual.detached).toBe(true);expect(result.visual.visible).toBe(true);}await page.getByRole('button',{name:'Restore truck'}).click();expect(await page.evaluate(()=>Object.values(window.__game!.snapshot().parts).every(p=>!p.detached))).toBe(true);});
test('live accelerated playback uses the normal frame loop',async({page})=>{await page.getByLabel('Playback speed').selectOption('16');await page.keyboard.down('w');await expect.poll(()=>page.evaluate(()=>window.__game!.snapshot().status),{timeout:20000}).toBe('finished');await page.keyboard.up('w');});
