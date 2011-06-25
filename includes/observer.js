if (window == window.top && window.history.length == 1) {
    opera.extension.postMessage({type:'open', url: window.location.href});
}
