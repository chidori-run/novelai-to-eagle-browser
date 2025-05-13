const fs = require("fs");
const path = require("path");

const { createEagleMemo, GeneratedImageParams, CharacterPrompt } = require("../novelai_to_eagle.user");

function dictToParams(data) {
    const params = new GeneratedImageParams();
    params.prompt_input = data.prompt_input || '';
    params.prompt_actual = data.prompt_actual || '';
    params.nprompt_input = data.nprompt_input || '';
    params.nprompt_actual = data.nprompt_actual || '';
    params.others = data.others || {};

    params.characters = (data.characters || []).map(charData => {
        const char = new CharacterPrompt();
        char.prompt_input = charData.prompt_input || '';
        char.prompt_actual = charData.prompt_actual || '';
        char.nprompt_input = charData.nprompt_input || '';
        char.nprompt_actual = charData.nprompt_actual || '';
        return char;
    });

    return params;
}

// JSONを読み込む関数
function loadTestCases() {
    const testFile = path.resolve(__dirname, "../test_cases/create_eagle_memo.json");
    const rawData = fs.readFileSync(testFile, "utf-8");
    return JSON.parse(rawData);
}

// 単体テスト実行関数
function createEagleMemoUT() {
    const testCases = loadTestCases();

    for (const testCase of testCases) {
        const name = testCase.name;
        const paramsDict = testCase.input;
        const expected = testCase.expected;

        const params = dictToParams(paramsDict);
        const actual = createEagleMemo(params);

        const result = actual.trim() === expected.trim() ? '✅ OK' : '❌ NG';
        console.log(`${name}: ${result}`);
        if (result === '❌ NG') {
            console.log('  Expected:');
            console.log(expected);
            console.log('  Actual:');
            console.log(actual);
        }
    }
}

// メイン実行
createEagleMemoUT();
