const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fixture } = require("./chat-fixture.cjs");
const { languageHint } = require("../dist/chat/prompt");

test("language hint follows the user's script and is only appended to the model input", (t) => {
  assert.equal(languageHint("오늘 뭐 했어요?"), "");
  assert.match(languageHint("Nipple stimulation"), /reply only in English/);
  assert.match(languageHint("こんにちは、元気ですか？"), /日本語/);
  assert.match(languageHint("你今天过得怎么样"), /中文/);
  assert.equal(languageHint("Hi 민준님, 잘 지내셨어요? 오늘 뭐 하셨어요"), "", "mostly Korean stays Korean");
  assert.equal(languageHint("!!! 123"), "");

  const f = fixture(); t.after(f.close);
  const c = f.chat.createConversation("owner", "a");
  const { messages } = f.chat.buildLlmMessages("owner", c.id, "What do you do for a living?");
  assert.match(messages.at(-1).content, /^What do you do for a living\?\n\n\(Maldongmu note/);
  assert.match(messages[0].content, /거절도 영어로/);
  f.chat.saveTurn("owner", c.id, "a", "What do you do for a living?", "I'm a librarian.", 10, 5);
  assert.equal(f.chat.getConversation("owner", c.id).messages.at(-2).content, "What do you do for a living?");
});
