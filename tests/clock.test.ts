import { describe,it,expect } from 'vitest';
import { FixedClock } from '../src/clock';
describe('fixed physics clock',()=>{
  it('uses identical 120 Hz ticks at 1x and 16x',()=>{
    const a=new FixedClock(),b=new FixedClock();let x=0,y=0;
    for(let i=0;i<960;i++)a.advance(1/60,1,()=>x++);
    for(let i=0;i<60;i++)b.advance(1/60,16,()=>y++);
    expect(x).toBe(1920);expect(y).toBe(x);
  });
  it('rejects invalid rate and elapsed time',()=>{const c=new FixedClock();expect(()=>c.advance(1,-1,()=>{})).toThrow();expect(()=>c.advance(NaN,1,()=>{})).toThrow();});
});
