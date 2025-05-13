
# NovelAI to Eagle for Browser

## 🔧 Overview

This userscript automatically registers images generated with **NovelAI Diffusion** into **Eagle**, along with various generation parameters such as prompts, seed value, sampler, and more.  
Perfect for those who organize their images using Eagle.

---

## 🚀 Installation

Compatible with userscript managers such as Tampermonkey.

[👉 **Install the script**](https://github.com/chidori-run/novelai-to-eagle-browser/raw/main/novelai_to_eagle.user.js)

---

## 🛠️ How to Use

1. **Launch Eagle**.
2. **Generate an image using NovelAI**.
3. The generated image will be **automatically registered into Eagle**.

Details of the registered information:

- **Prompts** are split by commas and each element is saved as an Eagle **tag**. The script also detects the generation method (text2image or image2image) and saves it as a tag.
  - Duplicate tags are merged into one.
  - Special characters used for emphasis or suppression in the prompt (like `{}`, `[]`, `::`) are automatically removed.
- The following information is saved in Eagle's **note** field:
  - Full prompt  
  - Negative prompt  
  - Number of steps  
  - Seed value  
  - Sampler, etc.

---

## 📄 License

This script is provided under the [MIT License](LICENSE).

- You are **free to use, modify, and redistribute** it for both commercial and non-commercial purposes.
- Retaining the copyright and license notice is required.
- **No warranties** are provided with this software.

---

## ⚠️ Disclaimer

The creator (Chidori Run) takes **no responsibility** for any issues or damages caused by the use of this software.  
Use it at **your own risk**.

---

## 👤 Author Information

**Author**: Chidori Run  
**Website**: [Runrun Sketch](https://runrunsketch.net)  
**Contact**: [Contact Form](https://runrunsketch.net/contact/)
