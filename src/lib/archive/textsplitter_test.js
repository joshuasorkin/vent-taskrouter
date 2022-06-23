const Textsplitter = require("../textsplitter");

async function test() {
  var textsplitter = new Textsplitter();
  var textArray = await textsplitter.splitTextFromFile(
    "critiqueofpurereason.txt"
  );
  var sentence = textsplitter.randomSentenceFromFiletextArray();
  console.log(sentence);
}

test();
//console.log(JSON.stringify(textArray));
