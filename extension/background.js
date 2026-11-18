// Bewaar in Schrijfkamer — opent een klein venster van de app met wat je wilt bewaren.
// Wil je een ander adres voor de app? Pas APP_URL aan.
const APP_URL = 'https://tomkoehorst.github.io/schrijven/';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'fragment', title: 'Bewaar als fragment', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'timeline', title: 'Zet op tijdlijn', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'page', title: 'Bewaar pagina als bron', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'link', title: 'Bewaar link als bron', contexts: ['link'] });
  });
});

// Read the selection (with line breaks) and some page details from the tab
async function pageInfo(tab) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const meta = (s) => (document.querySelector(s) || {}).content || '';
        const sel = window.getSelection(), links = [];
        if (sel && sel.rangeCount) {
          const add = (a) => { if (a && /^https?:/.test(a.href)) links.push({ url: a.href, text: (a.textContent || '').trim().slice(0, 140) }); };
          sel.getRangeAt(0).cloneContents().querySelectorAll('a[href]').forEach(add);
          const own = sel.anchorNode && sel.anchorNode.parentElement && sel.anchorNode.parentElement.closest('a[href]'); add(own);
        }
        return {
          links: links.slice(0, 20),
          text: String(window.getSelection() || '').trim(),
          title: meta('meta[property="og:title"]') || document.title,
          site: meta('meta[property="og:site_name"]') || location.hostname.replace(/^www\./, ''),
          url: (document.querySelector('link[rel="canonical"]') || {}).href || location.href
        };
      }
    });
    return res && res.result ? res.result : null;
  } catch (e) {
    return null; // e.g. chrome:// pages or the PDF viewer
  }
}

async function capture(mode, tab, extra = {}) {
  const info = (await pageInfo(tab)) || { text: '', title: tab.title || '', site: '', url: tab.url || '' };
  const data = {
    mode,
    url: extra.url || info.url || tab.url,
    title: extra.url ? (extra.linkText || extra.url) : (info.title || tab.title),
    site: extra.url ? '' : info.site,
    text: (info.text || extra.selectionText || '').slice(0, 20000),
    links: info.links || []
  };
  if ((mode === 'fragment' || mode === 'timeline') && !data.text) data.mode = 'page';
  const url = APP_URL + '#capture=' + encodeURIComponent(JSON.stringify(data));
  const width = 500, height = 720;
  let win = null;
  try { win = await chrome.windows.getLastFocused(); } catch (e) {}
  const opts = { url, type: 'popup', width, height };
  try {
    // Place it at the right side of the current window; Chrome refuses bounds that don't fit the screen
    await chrome.windows.create(win ? { ...opts, left: Math.max(0, (win.left || 0) + (win.width || 1200) - width - 40), top: Math.max(0, (win.top || 0) + 70) } : opts);
  } catch (e) {
    try { await chrome.windows.create(opts); }
    catch (e2) { await chrome.tabs.create({ url }); }
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'link') return capture('page', tab, { url: info.linkUrl, linkText: info.selectionText });
  capture(info.menuItemId, tab, { selectionText: info.selectionText });
});
chrome.commands.onCommand.addListener(async (command, tab) => {
  tab = tab || (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!tab) return;
  capture(command.replace('save-', ''), tab);
});
chrome.action.onClicked.addListener((tab) => capture('fragment', tab)); // no selection → page

// The app sets #saved when it is done: close that popup
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.url && change.url.startsWith(APP_URL) && change.url.endsWith('#saved')) {
    setTimeout(() => chrome.windows.remove(tab.windowId).catch(() => {}), 400);
  }
});
