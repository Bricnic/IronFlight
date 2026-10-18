import type {Simulation,Stage,Input} from './simulation';
export interface GameHarness {
 select(stage:Stage):void; pause(value:boolean):void; advanceFrames(frames:number,rate:number,input:Input):void;
 snapshot():ReturnType<Simulation['snapshot']>;
 visualPart(id:string):{detached:boolean;visible:boolean};
}
declare global {interface Window {__game?:GameHarness}}
