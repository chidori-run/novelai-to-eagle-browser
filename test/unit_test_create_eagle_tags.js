const fs = require("fs");
const path = require("path");

const { createEagleTags } = require("../novelai_to_eagle.user");


// JSONを読み込む関数
function loadTestCases() {
    const testFile = path.resolve(__dirname, "../test_cases/create_eagle_tags.json");
    const rawData = fs.readFileSync(testFile, "utf-8");
    return JSON.parse(rawData);
}

// 単体テスト実行関数
function createEagleTagsUT() {
    const testCases = loadTestCases();

    for (const isParseTag of [true, false]) {
        console.log(`\n[is_parse_tag = ${isParseTag}]`);

        for (const testCase of testCases) {
            const inputParams = testCase.input;
            const expected = isParseTag
                ? testCase.expected_tags_parse_true
                : testCase.expected_tags_parse_false;

            const actual = createEagleTags(inputParams, isParseTag);
            const result = JSON.stringify(actual) === JSON.stringify(expected) ? "✅ OK" : "❌ NG";

            console.log(`${testCase.name}: ${result}`);
            if (result === "❌ NG") {
                console.log(`  Expected: ${JSON.stringify(expected)}`);
                console.log(`  Actual  : ${JSON.stringify(actual)}`);
            }
        }
    }
}

// メイン実行
createEagleTagsUT();
