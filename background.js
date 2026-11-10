chrome.action.onClicked.addListener(() => {
  chrome.windows.create({ url: 'picker.html', type: 'popup', width: 400, height: 600 });
});
