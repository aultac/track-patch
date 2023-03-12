declare module 'linebyline' {
  import type EventEmitter from "events";

  export default function(filename: string): EventEmitter;
}
