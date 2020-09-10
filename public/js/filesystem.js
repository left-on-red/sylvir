(async function() {
    let fs = _('#filesystem');
    let crumbs = _('#breadcrumbs');
    let backnav = _('#backnav');

    function back() {
        if (backnav.class().includes('disabled')) { return }
        let url = window.location.pathname;
        if (url.endsWith('/')) { url = url.slice(0, url.length - 1) }
        url = url.split('/');
        url.pop();
        url.splice(1, 1);
        window.location.href = `/filesystem${url.join('/')}`;
    }

    function fullback() {
        if (backnav.class().includes('disabled')) { return }
        window.location.href = '/filesystem/';
    }

    _('#backCaret').on('click', back);
    _('#fullbackCaret').on('click', fullback);

    let url = window.location.pathname;
    if (url.endsWith('/')) { url = url.slice(0, url.length - 1) }

    backnav.class('-disabled');
    if (url == '/filesystem') { backnav.class('+disabled') }

    crumbs.empty();
    let path = unescape(url).split('/');
    path.shift();
    path.shift();

    let root = _.new('<div class="crumb">/</div>');
    root.on('click', function() { window.location.href = '/filesystem/' });
    crumbs.end(root);

    for (let p = 0; p < path.length; p++) {
        let lead = _.new('<div>>></div>');
        crumbs.end(lead);
        let collectivePath = `/${path.slice(0, p+1).join('/')}`;
        let crumb = _.new(`<div class="crumb">${path[p]}</div>`);
        crumb.on('click', function() { window.location.href = escape(`/filesystem${collectivePath}`) });
        crumbs.end(crumb);
    }

    fs.empty();

    let ul = _.new('ul');
    fs.end(ul);
    let items = await _.request.get(`/dir/${url.slice(12)}`, true);
    for (let i in items) {
        let type = 'directory';
        if (!items[i]) { type = i.split('.')[i.split('.').length - 1] }

        let li = _.new(`
            <li class="${type == 'directory' ? 'directory' : 'file'}">
                <div class="img">
                    <img src="/images/icons/${type}">
                    <span class="select">
                        <i class="fas fa-times"></i>
                        <i class="fas fa-check"></i>
                    </span>
                </div>
                <div class="entry">
                    <p class="filename">${i}</p>
                </div>
            </li>
        `);


        li._('div.entry').on('click', async function(event) {
            let newurl = `${url}/${escape(i)}`;
            window.location.href = newurl;
        });

        li._('span.select').on('click', async function(event) {
            if (li.class().includes('selected')) { li.class('-selected') }
            else { li.class('+selected') }

            if (_('.selected')) { fs.class('+selection') }
            else { fs.class('-selection') }
        });

        ul.end(li);
    }
})();