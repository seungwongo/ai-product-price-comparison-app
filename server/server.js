// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { OpenAI } = require("openai");
const dotenv = require("dotenv");

// 환경 변수 설정
dotenv.config();

const app = express();
const port = 3001;

// OpenAI API 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 파일 업로드를 위한 multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");

    // uploads 디렉토리가 없으면 생성
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExt = path.extname(file.originalname);
    cb(null, "product-" + uniqueSuffix + fileExt);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 용량 제한
  fileFilter: (req, file, cb) => {
    // 이미지 파일만 허용
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("이미지 파일만 업로드할 수 있습니다."), false);
    }
    cb(null, true);
  },
});

// 제품 분석 API 엔드포인트
app.post(
  "/api/analyze-product",
  upload.single("productImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "이미지 파일이 필요합니다." });
      }

      // 이미지 파일 경로
      const imagePath = req.file.path;

      // 이미지를 base64로 인코딩
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;

      // GPT-4.1 모델을 사용하여 이미지 분석
      const analysisResponse = await openai.responses.create({
        model: "gpt-4.1",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "이 이미지에 있는 제품이 무엇인지 분석해주세요. 제품명(영어와 중국어 포함)과 간단한 설명을 제공해주세요.",
              },
              {
                type: "input_image",
                image_url: dataURI,
              },
            ],
          },
        ],
      });

      // 이미지 분석 결과 텍스트 추출
      const analysisResult = analysisResponse.output[0].content[0].text;

      // 웹 검색을 통해 제품 가격 및 판매처 정보 검색
      const searchResponse = await openai.responses.create({
        model: "gpt-4.1",
        tools: [{ type: "web_search_preview" }],
        input: `다음 대만 제품의 가격과 판매처(최소 3곳 이상)를 알려주세요. 가격이 가장 저렴한 순서로 정렬해주세요. 판매처 정보에는 상점 이름, 가격(대만 달러), 위치 주소, 가능하면 웹사이트 주소도 포함해주세요:
      
      ${analysisResult}
      
      각 판매처에 대해 다음 정보를 제공해주세요:
      1. 상점 이름
      2. 제품 가격(대만 달러로)
      3. 주소
      4. 웹사이트 URL(있는 경우)
      `,
      });

      // 웹 검색 결과 추출
      const searchResult = searchResponse.output_text;
      console.log(searchResult);

      // 이미지 파일 삭제 (선택 사항)
      fs.unlinkSync(imagePath);

      // 클라이언트에 결과 반환
      res.json({ searchResult });
    } catch (error) {
      console.error("오류 발생:", error);
      res
        .status(500)
        .json({ error: "서버 오류가 발생했습니다.", details: error.message });
    }
  }
);

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
