import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

// const uId = Math.floor(Math.random() * 10000);
// let chatHistory = [];

// async function createAiState(){
//   return getMutableAIState<typeof AI>();
// }
async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
            amount * price
          }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}
// function getStorage(key: string){
//   return window.sessionStorage.getItem(key);
// }
// function setStorage(key: string, value: string){
//   // let uId_string = sessionStorage.getItem(`uId`);
//   // if (!uId_string) {
//   //   let uId = Math.floor(Math.random() * 10000);
//   // } else {
//   //   let uId = parseInt(JSON.parse(uId_string));
//   // }
//   window.sessionStorage.setItem(key, JSON.stringify(value));
// }

async function submitUserMessage(content: string, chatHistory?: []) {
  'use server'

  const aiState = getMutableAIState<typeof AI>();
  
  // let chatHistory_string = getStorage('chatHistory');
  // if (!chatHistory_string) {
  //   let chatHistory = [];
  // } else {
  //   let chatHistory = JSON.parse(chatHistory_string);
  // }

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })
  // Extract chat history from aiState.messages
  // chatHistory.push({
  //     role: 'user',  // 'user' or 'assistant'
  //     content: content,  // The actual message content
  //   });
  // setStorage('chatHistory', JSON.stringify(chatHistory));
  // let chatHistory = aiState.get().messages.map((message) => ({
  //   role: message.role,  // 'user' or 'assistant'
  //   content: message.content,  // The actual message content
  // }));
  console.log(chatHistory || []);
  let textStream = createStreamableValue<string>('');
  let textNode: React.ReactNode = <BotMessage content={textStream.value} />;

  const apiUrl = 'http://99.233.10.238:5000/chat'; // Replace with your FastAPI URL
  let finalResponse = '';
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: content,
        chat_history_v: chatHistory
      })
    });

    if (!response.ok || !response.body) {
      throw new Error('Response not OK or body is not readable');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let accumulatedContent = '';
    let answer = '';
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;

      const chunk = decoder.decode(value, { stream: true });
      accumulatedContent += chunk;
      // console.log(accumulatedContent);

      // Extract and process individual messages from the event stream
      const messages = accumulatedContent.split(' \n\n').filter(Boolean).map((msg) => msg.replace(/^data: /, ''));

      // Join the messages with a newline separator to maintain spaces
      const processedContent = messages.join('');
      answer += processedContent.toString();
      // console.log('answer' + answer);
      textStream.update(processedContent);
      
      // Ensure that we clear accumulatedContent after processing
      accumulatedContent = '';
    }

    // When the stream is complete
    textStream.done();
    finalResponse = answer;
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'assistant',
          content: answer // Update with the final content string
        }
      ]
    });
    // chatHistory.push({
    //   role: 'assistant',  // 'user' or 'assistant'
    //   content: answer,  // The actual message content
    // });
    
  } catch (error) {
    console.error('Error during fetch or stream processing:', error);
  }

  return {
    id: nanoid(),
    display: textNode, // Or any other relevant UI representation
    answer: finalResponse
  };
}



export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase,
    // createAiState
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState()

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Events props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
