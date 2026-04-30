# 데이터 형식

이 폴더에는 CBT에서 읽을 수 있는 JSON 샘플이 들어 있습니다.

`questions.sample.json`은 실제 기출 원문이 아니라 사이트 기능 확인용 연습문제입니다. 실제 2024/2025 기출 원문을 넣으려면 재배포 권한이 있는 자료를 JSON 또는 CSV로 변환해 사용하세요.

## JSON

```json
{
  "id": "my-dataset",
  "meta": {
    "title": "2024-2025 정보보안기사 필기",
    "version": "1.0.0",
    "licenseNote": "사용 권한 메모"
  },
  "exams": [
    {
      "id": "2024-01",
      "year": 2024,
      "round": "1",
      "name": "2024년 1회 필기",
      "isRealPastExam": true,
      "questions": [
        {
          "id": "2024-01-001",
          "subject": "시스템 보안",
          "text": "문제 원문",
          "choices": ["보기1", "보기2", "보기3", "보기4"],
          "answer": 2,
          "explanation": "해설",
          "tags": ["키워드"]
        }
      ]
    }
  ]
}
```

## CSV

헤더는 다음 이름을 사용합니다.

```csv
year,round,examName,id,subject,text,choice1,choice2,choice3,choice4,answer,explanation,tags,isRealPastExam
2024,1,2024년 1회 필기,2024-01-001,시스템 보안,문제,보기1,보기2,보기3,보기4,2,해설,태그1|태그2,true
```
