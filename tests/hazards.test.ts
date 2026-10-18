import {beforeAll,it,expect} from 'vitest';
import {Simulation,initPhysics} from '../src/simulation';
import {HAZARDS} from '../src/hazards';
import {ROUTES} from '../src/routes';
beforeAll(initPhysics);
it('increases obstacle count by route',()=>{expect(ROUTES.map(r=>HAZARDS.filter(h=>h.route===r.id).length)).toEqual([1,3,5]);});
for(const type of ['fire','hammer','spikes','lava'] as const)it(`${type} contact damages the real assembly`,()=>{const s=new Simulation('hard'),h=HAZARDS.find(h=>h.kind===type&&h.route==='hard')!;s.body.setTranslation({x:h.x,y:h.y,z:h.z},true);s.run(.3);expect(s.snapshot().damageEvents.some(e=>e.source===type)).toBe(true);expect(Object.values(s.snapshot().parts).some(p=>p.health<75)).toBe(true);expect(Number.isFinite(s.snapshot().position.y)).toBe(true);s.dispose();});
it('fire damage stops after leaving the volume',()=>{const s=new Simulation('easy'),h=HAZARDS.find(h=>h.kind==='fire')!;s.body.setTranslation({x:h.x,y:h.y,z:h.z},true);s.run(.1);const count=s.snapshot().damageEvents.length;s.body.setTranslation({x:-24,y:2,z:-60},true);s.run(.1);expect(s.snapshot().damageEvents.length).toBe(count);s.dispose();});
it('fast obstacle strikes produce damage without nonfinite physics',()=>{const s=new Simulation('hard'),h=HAZARDS.find(h=>h.kind==='hammer'&&h.route==='hard')!;s.body.setTranslation({x:h.x,y:h.y,z:h.z-3},true);s.body.setLinvel({x:0,y:0,z:45},true);s.run(.5);expect(s.snapshot().damageEvents.length).toBeGreaterThan(0);expect(Number.isFinite(s.snapshot().speed)).toBe(true);s.dispose();});
