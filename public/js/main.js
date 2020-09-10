(async function() {
    let body = _('body');
    let alternating = _('#alternating');
    async function reload() {
        let html = await _.request.get(`/html/${__activeView}.html`);
        body.end(html);
        alternating.set('src', `/js/${__activeView}.js`);
    }

    await reload();
})();