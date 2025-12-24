// ==UserScript==
// @name         NovelAI to Eagle
// @namespace    https://runrunsketch.net/
// @version      1.0.3
// @description  NovelAIで生成した画像をEagleに登録する
// @author       Chidori Run
// @copyright    2025 Chidori Run
// @license      MIT License
// @match        https://novelai.net/*
// @grant        GM.xmlHttpRequest
// @connect      localhost
// @updateURL    https://github.com/chidori-run/novelai-to-eagle-browser/raw/refs/heads/main/novelai_to_eagle.user.js
// @downloadURL  https://github.com/chidori-run/novelai-to-eagle-browser/raw/refs/heads/main/novelai_to_eagle.user.js
// ==/UserScript==

(function () {
    'use strict'

    // NovelAIで生成した画像をEagleに自動登録する
    const IS_PARSE_TAG = true

    const INVALID_POSITION = [-100, -100] // 未設定または無効な位置を示す特殊値
    const NAI_OUTPUT_MIN_WIDTH = 64
    const NAI_OUTPUT_MIN_HEIGHT = 64

    const registeredImageUrls = [] // Eagleに登録済の画像URL
    const MAX_IMAGE_HISTORY_COUNT = 100 // registeredImageUrlsの最大要素数

    const CHECK_INTERVAL_MS = 2000

    // 各キャラクターのプロンプトに関する情報
    class CharacterPrompt {
        constructor() {
            this.prompt_input = "" // 入力されたキャラクタープロンプト
            this.prompt_actual = "" // 実際に使用されたキャラクタープロンプト
            this.nprompt_input = "" // 入力されたキャラクターネガティブプロンプト
            this.nprompt_actual = "" // 実際に使用されたキャラクターネガティブプロンプト
            this.position = [0, 0] // キャラクターの位置
        }
    }

    // 画像生成時に使用されたパラメータ群
    class GeneratedImageParams {
        constructor() {
            this.prompt_input = "" // 入力されたベースプロンプト
            this.prompt_actual = "" // 実際に使用されたベースプロンプト
            this.nprompt_input = "" // 入力されたベースネガティブプロンプト
            this.nprompt_actual = "" // 実際に使用されたベースネガティブプロンプト
            this.characters = []
            this.others = {}
        }
    }

    class GeneratedImg {
        constructor(imageBlobUrl, name, width, height) {
            this.url = imageBlobUrl
            this.base64 = ""
            this.type = ""
            this.width = width
            this.height = height
            this.name = name
            this.params = null
        }

        // ファクトリー関数
        static async create(imageBlobUrl, name, width, height) {
            const instance = new GeneratedImg(imageBlobUrl, name, width, height)
            instance.base64 = await blobToBase64(imageBlobUrl)
            instance.type = detectImageFormatFromBase64(instance.base64)
            instance.params = await instance.readImgInfo(imageBlobUrl)
            return instance
        }

        // バイナリデータのチャンクを解析して情報を加工する
        async getPngInfo(imageBlobUrl) {
            const CHUNK_LEN_LEN = 4
            const CHUNK_TYPE_LEN = 4
            const CHUNK_CRC_LEN = 4

            const texts = [] // pngファイルから読み出したテキスト情報のリスト

            const response = await fetch(imageBlobUrl)
            const blob = await response.blob()
            const binaryData = await blob.arrayBuffer()
            const dataView = new DataView(binaryData)
            const decoder = new TextDecoder()

            let offset = 8 // PNGシグネチャの後から開始

            // チャンクの読み出し
            while (offset < dataView.byteLength) {
                // Length データのサイズ
                const dataLen = dataView.getUint32(offset, false)

                // Chunk Type チャンクの種類
                const chunkType = decoder.decode(new Uint8Array(binaryData, offset + CHUNK_LEN_LEN, CHUNK_TYPE_LEN))

                console.log(`${chunkType} : ${dataLen} byte`)

                // Chunk Data データ
                if (chunkType === "tEXt") {
                    texts.push(decoder.decode(new Uint8Array(binaryData, offset + (CHUNK_LEN_LEN + CHUNK_TYPE_LEN), dataLen)))
                }

                offset += CHUNK_LEN_LEN + CHUNK_TYPE_LEN + dataLen + CHUNK_CRC_LEN
                if (chunkType === "IEND") break
            }

            return texts
        }

        extractPrompt(rawData, params) {
            const promptInput = rawData.prompt ? rawData.prompt : ""

            let promptActual
            if (rawData.actual_prompts?.prompt?.base_caption) {
                promptActual = rawData.actual_prompts.prompt.base_caption
            } else {
                promptActual = promptInput
            }

            params.prompt_input = promptInput
            params.prompt_actual = promptActual
            console.log(`prompt_input: ${params.prompt_input}`)
            console.log(`prompt_actual: ${params.prompt_actual}`)
        }

        extractNPrompt(rawData, params) {
            const npromptInput = rawData.uc ? rawData.uc : ""

            let npromptActual
            if (rawData.actual_prompts?.negative_prompt?.base_caption) {
                npromptActual = rawData.actual_prompts.negative_prompt.base_caption
            } else {
                npromptActual = npromptInput
            }

            params.nprompt_input = npromptInput
            params.nprompt_actual = npromptActual
            console.log(`nprompt_input: ${params.nprompt_input}`)
            console.log(`nprompt_actual: ${params.nprompt_actual}`)
        }

        extractCharPrompt(rawData, params) {
            let inputPrompts
            if (rawData.v4_prompt?.caption?.char_captions) {
                inputPrompts = rawData.v4_prompt.caption.char_captions
            } else {
                inputPrompts = []
            }

            let inputNegPrompts
            if (rawData.v4_negative_prompt?.caption?.char_captions) {
                inputNegPrompts = rawData.v4_negative_prompt.caption.char_captions
            } else {
                inputNegPrompts = []
            }

            let actualPrompts
            if (rawData.actual_prompts?.prompt?.char_captions) {
                actualPrompts = rawData.actual_prompts.prompt.char_captions
            } else {
                actualPrompts = []
            }

            let actualNegPrompts
            if (rawData.actual_prompts?.negative_prompt?.char_captions) {
                actualNegPrompts = rawData.actual_prompts.negative_prompt.char_captions
            } else {
                actualNegPrompts = []
            }

            const len = Math.max(inputPrompts.length, inputNegPrompts.length, actualPrompts.length, actualNegPrompts.length)
            for (let i = 0; i < len; i++) {
                const chara = new CharacterPrompt()

                const input = inputPrompts[i] || {}
                const actual = actualPrompts[i] || {}
                const inputNeg = inputNegPrompts[i] || {}
                const actualNeg = actualNegPrompts[i] || {}

                chara.prompt_input = input.char_caption || ""
                chara.prompt_actual = actual.char_caption || chara.prompt_input
                chara.nprompt_input = inputNeg.char_caption || ""
                chara.nprompt_actual = actualNeg.char_caption || chara.nprompt_input

                const centers = input.centers
                if (centers && centers[0]) {
                    chara.position = [centers[0].x || INVALID_POSITION[0], centers[0].y || INVALID_POSITION[1]]
                } else {
                    chara.position = [...INVALID_POSITION]
                }

                params.characters.push(chara)
            }
            console.log(`characters: ${params.characters}`)
        }

        extractGenerationType(rawData, params) {
            const requestType = rawData.request_type ? rawData.request_type : ""

            let generationType
            if (requestType == "PromptGenerateRequest") {
                generationType = "text2image"
            } else if (requestType == "Img2ImgRequest") {
                generationType = "image2image"
            } else {
                generationType = ""
            }

            params.generation_type = generationType
            console.log(`generation_type: ${params.generation_type}`)
        }

        async readImgInfo() {
            // pngファイルからメタデータを取り出す
            const texts = await this.getPngInfo(this.url)
            console.log(`image metadata: ${texts}`)

            let rawData = {}

            for (let text of texts) {
                if (text.startsWith("Comment")) {
                    const parts = text.split("\x00")
                    if (parts.length > 1) {
                        try {
                            rawData = JSON.parse(parts[1])
                        } catch (e) {
                            console.error("JSON decode error:", e.message)
                        }
                    }
                    break
                }
            }

            const params = new GeneratedImageParams()
            this.extractPrompt(rawData, params)
            this.extractNPrompt(rawData, params)
            this.extractCharPrompt(rawData, params)
            this.extractGenerationType(rawData, params)

            const allowKeys = [
                "steps",
                "height",
                "width",
                "scale",
                "cfg_rescale",
                "seed",
                "noise_schedule",
                "sampler",
                "strength",
                "noise"
            ]

            const filteredData = {}
            for (const key of allowKeys) {
                if (key in rawData) {
                    filteredData[key] = rawData[key]
                }
            }

            params.others = filteredData
            console.log("others:%o", params.others)

            return params
        }

    }

    // Eagle関連

    // Eagleアプリが起動しているかを確認する
    function checkEagleWake() {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: "GET",
                url: "http://localhost:41595/api/application/info",
                onload: function (response) {
                    if (response.status >= 200 && response.status < 300) {
                        resolve()
                    } else {
                        console.info("Eagle Connection Error!")
                        reject()
                    }
                },
                onerror: function (error) {
                    console.info("Eagle Connection Error!")
                    reject()
                }
            })
        })
    }

    async function createEagleItem(image) {
        const params = image.params
        const eagle_tags = createEagleTags(params, IS_PARSE_TAG)
        const eagle_memo = createEagleMemo(params)

        const item = {
            "url": image.base64,
            "name": image.name,
            "website": "",
            "tags": eagle_tags,
            "annotation": eagle_memo,
            "folderId": "",
        }

        return item
    }

    function createEagleTags(params, isParseTag = true) {
        // プロンプトからタグを作成
        const allPrompts = []
        allPrompts.push(params.prompt_actual)
        if (Array.isArray(params.characters)) {
            for (const character of params.characters) {
                allPrompts.push(character.prompt_actual)
            }
        }

        const allPrompt = allPrompts.join(",")

        // カンマで区切る
        const rawTags = allPrompt.split(",")

        // 両端の空白を削除
        const strippedTags = []
        for (let tag of rawTags) {
            const strippedTag = tag.trim()
            if (strippedTag) {
                // 空タグは削除する
                strippedTags.push(strippedTag)
            }
        }

        // 強調・抑制タグの削除
        let cleanedTags = strippedTags
        if (isParseTag) {
            cleanedTags = cleanTagFormat(strippedTags)
        }

        // 重複削除（順序保持）
        const finalTags = []
        for (let tag of cleanedTags) {
            if (!finalTags.includes(tag)) {
                finalTags.push(tag)
            }
        }

        // 生成タイプ
        if (params.generation_type) {
            finalTags.push(`Generation Type: ${params.generation_type}`)
        }

        return finalTags
    }

    function cleanTagFormat(rawTags) {
        const cleanedTags = []

        // パターン1: 先頭・末尾の { } [ ] を削除
        const patternStartBrackets = /^[\{\[]+/
        const patternEndBrackets = /[\}\]]+$/

        rawTags.forEach(tag => {
            tag = tag.replace(patternStartBrackets, "")
            tag = tag.replace(patternEndBrackets, "")

            // パターン2: 数値:: を削除（先頭・末尾）
            tag = tag.replace(/^-?\d+(\.\d+)?::\s*/, "")
            tag = tag.replace(/\s*::$/, "")

            cleanedTags.push(tag)
        })

        return cleanedTags
    }

    // 与えられたパラメータからEagle用メモテキストを作成する
    function createEagleMemo(params) {
        const memoLines = []

        memoLines.push(`Prompt: ${params.prompt_actual}`)
        if (params.prompt_input !== params.prompt_actual) {
            memoLines.push(`  (Input Prompt: ${params.prompt_input})`)
        }

        params.characters.forEach((character, i) => {
            memoLines.push(`Character ${i + 1}:`)
            memoLines.push(`  Prompt: ${character.prompt_actual}`)
            if (character.prompt_input !== character.prompt_actual) {
                memoLines.push(`    (Input Prompt: ${character.prompt_input})`)
            }
            memoLines.push(`  Undesired Content: ${character.nprompt_actual}`)
            if (character.nprompt_input !== character.nprompt_actual) {
                memoLines.push(`    (Input Undesired Content: ${character.nprompt_input})`)
            }
            // キャラの位置 (position) は出力しない
        })

        memoLines.push(`Undesired Content: ${params.nprompt_actual}`)
        if (params.nprompt_input !== params.nprompt_actual) {
            memoLines.push(`  (Input Undesired Content: ${params.nprompt_input})`)
        }

        for (const [key, value] of Object.entries(params.others || {})) {
            const serializedValue = (typeof value === "object" && value !== null)
                ? JSON.stringify(value)
                : value
            memoLines.push(`${key}: ${serializedValue}`)
        }

        return memoLines.join("\n")
    }

    // Blob URL SchemeからBase64に変換する
    async function blobToBase64(imageBlobUrl) {
        const response = await fetch(imageBlobUrl)
        const blob = await response.blob()
        const reader = new FileReader()
        reader.readAsDataURL(blob)

        await new Promise((resolve) => { reader.onload = () => { resolve() } })

        return reader.result
    }

    // Base64の画像形式を判別する
    function detectImageFormatFromBase64(base64) {
        const binary = atob(base64.split(',')[1])
        const firstBytes = binary.slice(0, 4)

        // マジックナンバーで判定
        if (firstBytes.charCodeAt(0) === 0xFF && firstBytes.charCodeAt(1) === 0xD8) {
            return 'image/jpeg'
        } else if (firstBytes.charCodeAt(0) === 0x89 && firstBytes.charCodeAt(1) === 0x50) {
            return 'image/png'
        } else {
            return 'unknown'
        }
    }

    // Base64に登録データを付与してEagleに送る
    function sendItemToEagle(item, imageUrl) {
        GM.xmlHttpRequest({
            url: "http://localhost:41595/api/item/addFromURL",
            method: "POST",
            data: JSON.stringify(item, imageUrl),
            onload: function (response) {
                console.log(response.responseText)
                if (registeredImageUrls.length >= MAX_IMAGE_HISTORY_COUNT) {
                    registeredImageUrls.shift() // 最大要素数を超えたら古い要素から削除
                }

                registeredImageUrls.push(imageUrl) // 新しいURLを追加
            },
            onerror: function (error) {
                console.error("Eagleへの送信失敗:", error)
            }
        })
    }

    console.log("window type: " + typeof window)
    if (typeof window === 'object') {
        syncImagesToEagle()
    }

    async function syncImagesToEagle() {
        console.log("syncImagesToEagle start")
        while (true) {
            await generatedImgToEagle()
            await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS))
        }
    }

    // 新規画像が生成されたかチェックしてEagleに画像を登録する
    async function generatedImgToEagle() {
        if (!window.location.href.startsWith("https://novelai.net/image")) return // 対象ページでなければ何もしない

        // 新規画像が生成されたかチェック
        const imageAreas = document.getElementsByClassName("display-grid-images")
        if (imageAreas.length === 0) return

        const images = imageAreas[0].getElementsByTagName("img")

        for (let img of images) {
            const imageUrl = img.getAttribute("src")


            // すでにEagleに登録済ならスキップする
            if (registeredImageUrls.includes(imageUrl)) continue

            const imageAlt = img.getAttribute("alt") || ""
            console.log(`image url: ${imageUrl}`)
            console.log(`image alt: ${imageAlt}`)
            console.log(`image size: ${img.naturalWidth} * ${img.naturalHeight}`)

            const genImage = await GeneratedImg.create(imageUrl, imageAlt, img.naturalWidth, img.naturalHeight)

            // png以外はスキップする
            if (genImage.type != "image/png") continue
            // 最小サイズ未満の場合はスキップする
            if (genImage.width < NAI_OUTPUT_MIN_WIDTH || genImage.height < NAI_OUTPUT_MIN_HEIGHT) continue

            const item = await createEagleItem(genImage)
            // console.log(`Eagle item: ${item}`)

            // 生成画像をEagleに送る
            try {
                await checkEagleWake()
                sendItemToEagle(item, imageUrl)
            } catch (error) {
                alert("Eagleに接続できませんでした。\nアプリが起動しているか確認してください。")
                // アラートが閉じられたら次の処理に進む
                sendItemToEagle(item, imageUrl)
            }

        }

    }

    module.exports = {
        createEagleTags,
        createEagleMemo,
        GeneratedImageParams,
        CharacterPrompt
    }

})();