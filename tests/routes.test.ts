import {beforeAll,it,expect} from 'vitest';
import {Simulation,initPhysics} from '../src/simulation';
import {ROUTES} from '../src/routes';
beforeAll(initPhysics);
for(const route of ROUTES){it(`${route.id} can be driven from rest across its gap to the finish`,()=>{const s=new Simulation(route.id);s.run(12,{throttle:1});const t=s.snapshot();expect(t.airborneTicks).toBeGreaterThan(20);expect(t.landed).toBe(true);expect(t.status).toBe('finished');expect(t.position.z).toBeGreaterThan(route.finish);s.dispose();});}
it('insufficient speed does not win',()=>{const s=new Simulation('hard');s.run(15,{throttle:.08});expect(s.snapshot().status).not.toBe('finished');s.dispose();});
it('misalignment does not win',()=>{const s=new Simulation('easy');s.run(12,{throttle:1,steer:.7});expect(s.snapshot().status).not.toBe('finished');s.dispose();});
