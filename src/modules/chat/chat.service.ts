import { GoogleGenerativeAI } from '@google/generative-ai';
import { docClient, MAIN_TABLE } from '../../utils/awsClient';
import { ScanCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'fake-key-for-now');

const tools: any = [
  {
    functionDeclarations: [
      {
        name: 'searchProducts',
        description: 'Search for products based on category, maximum price, and gender. Returns a list of matching products.',
        parameters: {
          type: 'OBJECT',
          properties: {
            category: { type: 'STRING', description: 'Product category (e.g. Outerwear, Innerwear, Topwear, Kids, T-Shirt, Jacket)' },
            maxPrice: { type: 'NUMBER', description: 'Maximum price limit in INR' },
            gender: { type: 'STRING', description: 'Target gender (e.g. MALE, FEMALE, UNISEX)' }
          }
        }
      },
      {
        name: 'checkOrderStatus',
        description: 'Check the shipping status of an order using the order ID.',
        parameters: {
          type: 'OBJECT',
          properties: {
            orderId: { type: 'STRING', description: 'The unique order ID (e.g., WDT12345678)' }
          },
          required: ['orderId']
        }
      }
    ]
  }
];

export class ChatService {
  public static async processMessage(history: any[], message: string) {
    if (!process.env.GEMINI_API_KEY) {
      return { text: 'I am currently in demo mode because the GEMINI_API_KEY is not configured on the server. Please add it to the .env file.' };
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest',
      tools,
      systemInstruction: "You are the WearDynamite E-Commerce Assistant. You help customers find clothing products and track orders. Be friendly, concise, and helpful. Do not mention that you use tools, just present the information."
    });

    let formattedHistory = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
      formattedHistory.shift();
    }

    const contents: any[] = [
      ...formattedHistory,
      { role: 'user', parts: [{ text: message }] }
    ];

    // Log chat to DB for analytics
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toISOString();
      await docClient.send(new PutCommand({
        TableName: MAIN_TABLE,
        Item: {
          PK: `CHATLOG#${dateStr}`,
          SK: `${timeStr}#${Math.random().toString(36).substr(2, 9)}`,
          entity_type: 'CHATLOG',
          query: message,
          intent: 'general', // We will update this if a function is called
          timestamp: timeStr
        }
      }));
    } catch (e) {
      console.error('Error logging chat', e);
    }

    try {
      const result = await model.generateContent({ contents });
      const response = result.response;
      
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        
        // Push the EXACT model response to preserve internal metadata like 'thought_signature'
        if (response.candidates && response.candidates.length > 0) {
          contents.push(response.candidates[0].content);
        } else {
          contents.push({
            role: 'model',
            parts: [{ functionCall: call }]
          });
        }

        let toolResponse = null;
        let actionResult = null;

        if (call.name === 'searchProducts') {
          const { category, maxPrice, gender } = call.args as any;
          const products = await this.searchProductsInDB(category, maxPrice, gender);
          
          if (products.length > 0) {
            const mappedProducts = products.slice(0, 5).map((p: any) => ({ 
              id: p.product_id || p.PK.replace('PRODUCT#',''), 
              name: p.product_name || 'Unnamed Product', 
              price: p.salePrice || p.mrp || 0
            }));
            toolResponse = { products: mappedProducts };
            actionResult = { type: 'product_list', data: mappedProducts };
          } else {
            toolResponse = { message: "No products found matching those criteria." };
          }
        } else if (call.name === 'checkOrderStatus') {
          const status = await this.checkOrderStatusInDB((call.args as any).orderId);
          toolResponse = { status };
        }

        if (toolResponse) {
          contents.push({
            role: 'user', 
            parts: [{
              functionResponse: {
                name: call.name,
                response: toolResponse
              }
            }]
          });

          const followUp = await model.generateContent({ contents });
          return {
            text: followUp.response.text(),
            action: actionResult
          };
        }
      }

      return { text: response.text() };
    } catch (error) {
      console.error('Chat error:', error);
      return { text: 'I am currently experiencing technical difficulties. Please try again later.' };
    }
  }

  private static async searchProductsInDB(category?: string, maxPrice?: number, gender?: string) {
    const params: any = {
      TableName: MAIN_TABLE,
      FilterExpression: 'begins_with(PK, :pk)',
      ExpressionAttributeValues: {
        ':pk': 'PRODUCT#'
      }
    };
    
    const { Items } = await docClient.send(new ScanCommand(params));
    let products = Items || [];
    
    if (category) {
      products = products.filter((p: any) => p.category?.toLowerCase().includes(category.toLowerCase()) || p.subCategory?.toLowerCase().includes(category.toLowerCase()));
    }
    if (maxPrice) {
      products = products.filter((p: any) => (p.salePrice || p.mrp || 99999) <= maxPrice);
    }
    if (gender) {
      products = products.filter((p: any) => p.gender?.toLowerCase() === gender.toLowerCase());
    }
    
    return products;
  }

  private static async checkOrderStatusInDB(orderId: string) {
    try {
      const params = {
        TableName: MAIN_TABLE,
        Key: {
          PK: `ORDER#${orderId}`,
          SK: `ORDER#${orderId}`
        }
      };
      const { Item } = await docClient.send(new GetCommand(params));
      
      if (Item) {
        return `Order status is: ${Item.orderStatus || 'Processing'}. Expected delivery by ${new Date(Date.now() + 5*24*60*60*1000).toDateString()}.`;
      }
    } catch (e) {
      console.error(e);
    }
    return "I couldn't find an order with that ID. Please ensure it starts with WDT.";
  }
}
