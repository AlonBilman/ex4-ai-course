module.exports = {
  searchSurveys: jest.fn().mockResolvedValue({
    matches: [{ id: "mockSurveyId", reason: "Mocked reason" }],
  }),
  validateResponse: jest.fn().mockResolvedValue({
    isValid: true,
    feedback: "Mocked feedback",
    violations: [],
  }),
  generateSummary: jest.fn().mockResolvedValue({
    summary: "Mocked summary",
    keyPoints: ["Mocked point"],
    trends: [],
    recommendations: [],
  }),
};
