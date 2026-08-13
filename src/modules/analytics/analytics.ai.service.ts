import { GoogleGenerativeAI } from '@google/generative-ai';

export class AnalyticsAIService {
  private static getModel() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  }

  public static async generateInsights(analyticsData: any): Promise<string[]> {
    try {
      const model = this.getModel();
      const prompt = `
        You are an expert e-commerce data analyst for WearDynamite.
        Analyze the following real-time dashboard data and provide exactly 3 bullet points of actionable insights or anomaly warnings.
        Keep each point under 25 words. Be direct and insightful. Do not include introductory text.
        
        DATA:
        ${JSON.stringify(analyticsData, null, 2)}
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      return text.split('\n')
        .map(line => line.trim().replace(/^[-*•]\s*/, ''))
        .filter(line => line.length > 5)
        .slice(0, 3);
    } catch (error: any) {
      console.error('Error generating AI insights:', error.message || error);
      if (error?.status === 429 || error?.message?.includes('429')) {
        return ["AI is currently busy analyzing other data (Rate Limit Exceeded). Please wait a minute and refresh."];
      }
      return ["AI Insights currently unavailable due to an unexpected error."];
    }
  }

  public static async chatWithData(analyticsData: any, query: string): Promise<string> {
    try {
      const model = this.getModel();
      const prompt = `
        You are an AI assistant built into the admin analytics dashboard of an e-commerce store (WearDynamite).
        Answer the user's question accurately based ONLY on the provided JSON data.
        Keep your answer very concise, friendly, and under 50 words.
        
        DATA:
        ${JSON.stringify(analyticsData, null, 2)}
        
        USER QUESTION:
        ${query}
      `;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error: any) {
      console.error('Error in AI Chat with Data:', error.message || error);
      if (error?.status === 429 || error?.message?.includes('429')) {
        return "I am receiving too many requests right now. Please wait a minute and try again.";
      }
      return "Sorry, I encountered an error analyzing the data.";
    }
  }
}
