// Read logical (wrapped) lines so preview links survive terminal resizing.
export function terminalWebLinks(terminal,open){
 terminal.registerLinkProvider({provideLinks(y,callback){
  const buffer=terminal.buffer.active;let first=y-1,last=y-1;
  while(first>0&&buffer.getLine(first)?.isWrapped)first--;
  while(last+1<buffer.length&&buffer.getLine(last+1)?.isWrapped)last++;
  let text='',cells=[];
  for(let row=first;row<=last;row++){const line=buffer.getLine(row);if(!line)continue;for(let x=0;x<terminal.cols;x++){const cell=line.getCell(x);if(!cell||!cell.getWidth())continue;const value=cell.getChars()||' ';for(let i=0;i<value.length;i++)cells.push({x:x+1,y:row+1});text+=value;}}
  const links=[];for(const match of text.matchAll(/https?:\/\/[^\s<>"'`]+/g)){const value=match[0].replace(/[),.;!?\]}]+$/,'');const start=cells[match.index],end=cells[match.index+value.length-1];if(!start||!end||y<start.y||y>end.y)continue;links.push({text:value,range:{start,end},activate:()=>open(value)});}
  callback(links);
 }});
}
