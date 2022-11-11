chrome.runtime.onInstalled.addListener(() => {
  console.log('JWT EXT INSTALLED');
});

const PROTOCOLS = ['http://', 'https://'];
const TARGET_HOST = 'localhost';

// When the user clicks on the extension action
chrome.action.onClicked.addListener(async (activeTab) => {
  try {
    const jwts = await chrome.cookies.getAll(
      { url: activeTab.url },
    ).then(cookies =>
      cookies
        .filter(cookie => cookie.name.startsWith('jwt') || cookie.name.startsWith('_jwt'))
        .map(cookie => {
          delete cookie.session;
          delete cookie.hostOnly;
          return { ...cookie, domain: TARGET_HOST }
        })
    );

    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      function: (jwts) => console.log('FOUND JWTS', jwts),
      args: [jwts],
    });

    await chrome.tabs.query({}).then(tabs => tabs.forEach(tab => {
      const host = PROTOCOLS.reduce((host, protocol) =>
        tab.url.startsWith(protocol) ? tab.url.slice(protocol.length) : host,
        undefined,
      );
      if (host?.startsWith(TARGET_HOST)) {
        jwts.forEach(jwt => chrome.cookies.set({ ...jwt, url: tab.url }));
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          function: (jwts, url) => {
            console.log('INJECTED', jwts, 'INTO', url);
            alert(`INJECTED ${jwts.map(jwt => jwt.name + '\n' + jwt.value)} \nINTO ${url}`);
          },
          args: [jwts, tab.url],
        });
      }
    }));
  } catch(err) {
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      function: (err) => console.error('Error copying jwt', err),
      args: [err],
    }); 
  }
});
