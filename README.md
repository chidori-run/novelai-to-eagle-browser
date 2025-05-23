> An English version of this README is available here: [README_en.md](README_en.md)

# NovelAI to Eagle ブラウザ版

## 🔧 概要

このユーザースクリプトは、**NovelAI Diffusion**で生成された画像を、生成時の各種パラメータ情報（プロンプト、シード値、サンプラーなど）とともに**Eagle**に自動で登録します。Eagleを使って画像整理をしている方に最適です。

---

## 🚀 インストール

Tampermonkeyなどのユーザースクリプトマネージャーに対応しています。

[👉 **スクリプトをインストールする**](https://github.com/chidori-run/novelai-to-eagle-browser/raw/refs/heads/main/novelai_to_eagle.user.js)


---

## 🛠️ 使い方

1. **Eagleを起動**しておきます。
2. **NovelAIで画像を生成**します。
3. 生成された画像が**自動的にEagleに登録**されます。

登録される情報の詳細：

- **プロンプト**はカンマ区切りで分割され、それぞれがEagleの「**タグ**」として登録されます。また、生成方法（text2imageまたはimage2image）についても自動判別され、タグとして登録されます。
  - 重複しているタグは1つに統合されます。
  - プロンプト内の強調・抑制記号（{}、[]、::）は自動的に削除されます。
- Eagleの「**メモ**」には以下の情報が記録されます：
  - プロンプト全体
  - ネガティブプロンプト
  - ステップ数
  - シード値
  - サンプラー など

---

## 📄 ライセンス

本スクリプトは [MITライセンス](LICENSE) のもとで提供されます。

- 商用・非商用を問わず**自由に使用・改変・再配布**できます。
- 著作権表記とライセンス文の保持が条件です。
- ソフトウェアの提供に関する**一切の保証はありません**。

---

## ⚠️ 免責事項

本ソフトウェアの使用により発生したいかなる不具合や損害についても、制作者（千鳥るん）は一切の責任を負いません。  
**自己責任**にてご利用ください。

---

## 👤 作者情報

**制作者**：千鳥るん  
**サイト**：[るんるんスケッチ](https://runrunsketch.net)  
**お問い合わせ**：[お問い合わせフォーム](https://runrunsketch.net/contact/)

---