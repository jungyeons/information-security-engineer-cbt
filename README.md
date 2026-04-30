# 정보보안기사 필기 CBT

정보보안기사 2024/2025 필기 기출을 풀 수 있도록 만든 정적 CBT 사이트입니다.

현재 포함된 `data/questions.sample.json`은 실제 기출 원문이 아닌 기능 확인용 샘플입니다. 실제 기출 원문은 저작권과 재배포 권한을 확인한 JSON/CSV 파일만 가져와 사용하세요.

## 기능

- 회차/과목별 문제 풀이
- 학습 모드, 실전 모드, 오답 모드
- 즐겨찾기, 오답 저장, 풀이 기록 저장
- 평균 60점 및 과목별 40점 기준 채점
- JSON/CSV 데이터 가져오기
- GitHub Pages 배포 워크플로 포함

## 로컬 실행

정적 파일이지만 브라우저가 JSON 파일을 읽어야 하므로 로컬 서버로 확인하는 편이 가장 안정적입니다.

```bash
python3 -m http.server 5173
```

이후 `http://localhost:5173`으로 접속하세요.

## GitHub Pages 배포

GitHub CLI를 쓸 수 있다면 다음 순서로 새 저장소를 만들 수 있습니다.

```bash
gh auth login
gh repo create information-security-engineer-cbt --public --source=. --remote=origin --push
```

그다음 GitHub 저장소의 `Settings > Pages`에서 `GitHub Actions`를 선택합니다. 이후 `main` 브랜치에 푸시하면 `.github/workflows/pages.yml`이 정적 파일을 배포합니다.

배포 주소는 보통 다음 형태입니다.

```text
https://<github-id>.github.io/information-security-engineer-cbt/
```

## 실제 기출 데이터 넣기

권한 있는 자료를 `data/questions.real.json`처럼 추가한 뒤, `index.html`의 앱 로딩 부분을 확장하거나 화면의 `JSON/CSV 선택` 버튼으로 가져오면 됩니다. 가져온 데이터는 브라우저 `localStorage`에 저장됩니다.

JSON/CSV 스키마는 [data/README.md](./data/README.md)를 참고하세요.

## 확인한 공개 출처 메모

- COMCBT 정보보안기사 필기 목록은 2023년 03월 11일 21회까지 확인됩니다.
- 2024/2025 실제 기출 원문은 공식적으로 재배포 가능한 공개 원문을 확인한 뒤 넣는 편이 안전합니다.
