const Textsplitter=require('./textsplitter');

var textsplitter=new Textsplitter();

var textArray=textsplitter.splitTextFromFile("critiqueofpurereason.txt");
console.log(JSON.stringify(textArray));