// src/App.js
import React, { useState } from "react";
import "./App.css";
import { marked } from "marked";

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);

      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError("제품 사진을 업로드해주세요");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("productImage", file);

      const response = await fetch(
        "http://localhost:3001/api/analyze-product",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(`오류가 발생했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>대만 제품 가격 비교</h1>
        <p>제품 사진을 업로드하시면 가격과 판매처를 알려드립니다</p>
      </header>

      <main>
        <form onSubmit={handleSubmit}>
          <div className="upload-container">
            <label htmlFor="product-image" className="upload-label">
              {preview ? (
                <img
                  src={preview}
                  alt="제품 미리보기"
                  className="image-preview"
                />
              ) : (
                <div className="upload-placeholder">
                  <span>+</span>
                  <p>제품 사진 업로드</p>
                </div>
              )}
            </label>
            <input
              type="file"
              id="product-image"
              accept="image/*"
              onChange={handleFileChange}
              className="file-input"
            />
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "분석 중..." : "제품 분석하기"}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>제품을 분석하고 가격 정보를 찾는 중입니다...</p>
          </div>
        )}

        {results && (
          <div className="results-container">
            <h2>분석 결과</h2>
            <div className="product-info">
              {/* <h3>{results.productName}</h3> */}
              {/* <p className="product-description">{results.description}</p> */}
            </div>

            <h3>판매처 목록 (저가순)</h3>
            <div
              className="stores-list"
              dangerouslySetInnerHTML={{
                __html: marked.parse(results.searchResult),
              }}
            ></div>
          </div>
        )}
      </main>

      <footer>
        <p>© 2025 대만 제품 가격 비교 | 여행자를 위한 서비스</p>
      </footer>
    </div>
  );
}

export default App;
