import React from 'react'
import { PublicClientApplication } from '@azure/msal-browser';
import { ChromeLogin, ChromeLogout, MsalConfig } from '../../content/login';
import { PrimaryButton, Text, Stack } from '@fluentui/react';

const tokens = {
  sectionStack: {
    childrenGap: 10,
  },
  headingStack: {
    childrenGap: 5,
  },
};

const App = (): JSX.Element => {
  const [token, setToken] = React.useState<string | null>(null);
  const msalInstance = new PublicClientApplication(MsalConfig);
  const [summaryStr, setSummaryStr] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Retrieve token from chrome storage
    chrome.storage.local.get(['token'], (result) => {
      setToken(result.token);
    });
  }, []);

  const saveTokenToStorage = function(token: string | null) {
    chrome.storage.local.set({token: token}, function() {
      if (chrome.runtime.lastError) {
          console.log(chrome.runtime.lastError.message);
      } else {
          console.log('Token saved');
      }
    });
    setToken(token);
  }

  const handleLogin = async () => {
    await msalInstance.initialize();
    try {
      ChromeLogin(function(token: string) {
        saveTokenToStorage(token)
        setToken(token);
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleLogout = async () => {
    await msalInstance.initialize();
    try {
      ChromeLogout(token!);
      setToken(null);

      // Store token
      saveTokenToStorage(null)
    } catch (error) {
      console.log(error);
    }
  };

  const getWorkItems = async () => {
    return new Promise((resolve, reject) => {
      console.log("getWorkItems");
      chrome.tabs.getSelected(function(tab){ 
        console.log("tab Id :", tab.id);
        chrome.tabs.sendMessage(tab.id ?? 0, {greeting: "hello"}, function(response) {
          const resp = JSON.stringify(response);
          console.log(resp);
          const workItems = JSON.parse(resp).data;
          const workItemList = workItems.map((item: any, index: number) => `${index + 1}. ${item}`).join("\n");
          resolve(workItemList);
        });
      });
    });
  }

  const handleSummary = async () => {
    try {
      const workItemList = await getWorkItems();
      console.log("workItems : ", workItemList);
      const message_text = [{"role":"system","content":"You are an AI assistant that helps summary the work Item List."},{"role":"user","content": `${workItemList}`}]
      const response = await fetch('https://validationframework-gpt4.openai.azure.com/openai/deployments/VF-GPT4/chat/completions?api-version=2024-02-15-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': ''
        },
        body: JSON.stringify({
          messages: message_text,
          max_tokens: 800,
          temperature: 0.7,
          frequency_penalty: 0,
          presence_penalty: 0,
          top_p: 0.95,
          stop: null
        })
      });
  
      if (response.ok) {
        const data = await response.json();
        const completion = JSON.stringify(data.choices[0].message);
        const completionText = JSON.parse(completion).content;
        console.log(`Summarization: ${completionText}`);
        setSummaryStr(completionText);
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Stack tokens={tokens.sectionStack} style={{width: 500}}>
      <Text variant='large' block >Extension Setting</Text>
      <Text variant='small' block >Don&apos;t login with Microsoft enterprise account! It will fail!</Text>
      <Text variant='small' block >Login with you personal Outlook account, and don&apos;t record confidential content in it.</Text>
        {token ? (
          <Stack tokens={tokens.headingStack}>
            <Text variant='small' block >You have login successfully.</Text>
            <Text variant='xSmall' nowrap={false} block >Token: {token}</Text>
            <PrimaryButton onClick={handleLogout}>Logout</PrimaryButton>
          </Stack>
        ) : (
          <Stack tokens={tokens.headingStack}>
            <PrimaryButton onClick={handleLogin}>Personal Outlook account Login</PrimaryButton>
          </Stack>
        )}
      <Stack tokens={tokens.headingStack}>
        <PrimaryButton onClick={handleSummary}>Summary</PrimaryButton>
      </Stack>
      {summaryStr && <Text variant='small' block >Summary: {summaryStr}</Text>}
    </Stack>
  );
}

export default App
