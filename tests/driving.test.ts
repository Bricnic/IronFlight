import { beforeAll,describe,it,expect } from 'vitest';
import { Simulation,initPhysics } from '../src/simulation';
beforeAll(initPhysics);
describe('monster truck physics',()=>{
  it('rests on suspension without falling through ground',()=>{const s=new Simulation('lab');s.run(3);expect(s.snapshot().position.y).toBeGreaterThan(1);expect(Math.abs(s.snapshot().velocity.y)).toBeLessThan(.2);s.dispose();});
  it('accelerates, brakes and resets a real rigid body',()=>{const s=new Simulation('lab');s.run(3,{throttle:1});expect(s.snapshot().speed).toBeGreaterThan(8);const speed=s.snapshot().speed;s.run(2,{brake:1});expect(s.snapshot().speed).toBeLessThan(speed*.5);s.reset('lab');expect(s.snapshot().speed).toBe(0);expect(s.snapshot().time).toBe(0);s.dispose();});
  it('steering changes heading and lateral position',()=>{const s=new Simulation('lab');s.run(2,{throttle:1});s.run(1,{throttle:1,steer:.4});expect(Math.abs(s.snapshot().position.x)).toBeGreaterThan(.2);s.dispose();});
  it('replays the same inputs identically',()=>{const a=new Simulation('lab'),b=new Simulation('lab');a.run(2,{throttle:.8});b.run(2,{throttle:.8});expect(a.snapshot().position).toEqual(b.snapshot().position);a.dispose();b.dispose();});
});
