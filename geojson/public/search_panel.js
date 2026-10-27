// The search button of the GeoJSON editor's map (copied from the mission planner): a button under the layers button that opens a small panel to type an
// address or "latitude, longitude" and jump the map there, with suggestions under the box as one types. Plain DOM, no
// map library or network calls, so that it can be tested; map_view.js puts it on the map as a control and does the
// actual coordinate parsing/geocoding.
(function (root) {
    var MIN_CHARS = 3, DELAY_MS = 300, MAX_SUGGESTIONS = 5;

    // opts: {onSearch(query), suggest(query) -> Promise<[{label, detail, center, bbox}]>, onPick(suggestion)}.
    // Returns {element, setLoading(bool), setError(message), open(), close(), isOpen()}
    function createSearchPanel(doc, opts) {
        var element = doc.createElement("div");
        element.className = "gj-search-control maplibregl-ctrl maplibregl-ctrl-group";

        var button = doc.createElement("button");
        button.type = "button";
        button.className = "gj-search-button";
        button.title = "Search for an address or coordinates";
        button.setAttribute("aria-label", "Search for an address or coordinates");
        button.setAttribute("aria-expanded", "false");
        button.innerHTML = '<i class="fa fa-search"></i>';
        element.appendChild(button);

        var panel = doc.createElement("div");
        panel.className = "gj-search-panel";
        panel.hidden = true;
        element.appendChild(panel);

        var form = doc.createElement("form");
        var input = doc.createElement("input");
        input.type = "text";
        input.className = "gj-search-input";
        input.placeholder = "Address or latitude, longitude";
        input.autocomplete = "off";
        input.setAttribute("role", "combobox");
        input.setAttribute("aria-autocomplete", "list");
        input.setAttribute("aria-expanded", "false");
        form.appendChild(input);

        var submit = doc.createElement("button");
        submit.type = "submit";
        submit.className = "gj-search-submit";
        submit.innerHTML = '<i class="fa fa-search"></i>';
        form.appendChild(submit);
        panel.appendChild(form);

        var list = doc.createElement("ul");
        list.className = "gj-search-list";
        list.setAttribute("role", "listbox");
        list.hidden = true;
        panel.appendChild(list);

        var error = doc.createElement("div");
        error.className = "gj-search-error";
        error.hidden = true;
        panel.appendChild(error);

        // -- suggestions ------------------------------------------------------------------------------------------------

        var shown = [], active = -1, timer = null, asked = 0, cache = {};

        function showList(suggestions) {
            shown = (suggestions || []).slice(0, MAX_SUGGESTIONS);
            active = -1;
            list.innerHTML = "";
            shown.forEach(function (s, i) {
                var item = doc.createElement("li");
                item.className = "gj-search-item";
                item.setAttribute("role", "option");
                var label = doc.createElement("span");
                label.className = "gj-search-label";
                label.textContent = s.label;
                item.appendChild(label);
                if (s.detail) {
                    var detail = doc.createElement("span");
                    detail.className = "gj-search-detail";
                    detail.textContent = s.detail;
                    item.appendChild(detail);
                }
                item.addEventListener("click", function () { pick(i); });
                list.appendChild(item);
            });
            list.hidden = !shown.length;
            input.setAttribute("aria-expanded", String(shown.length > 0));
        }
        function hideList() { showList([]); }
        function listShown() { return !list.hidden; }

        function setActive(i) {
            active = i;
            Array.prototype.forEach.call(list.children, function (item, j) {
                item.classList.toggle("active", j === i);
                item.setAttribute("aria-selected", String(j === i));
            });
        }

        // Whatever is still on its way is no longer wanted
        function forget() {
            if (timer) clearTimeout(timer);
            timer = null;
            asked++;
        }

        function pick(i) {
            var s = shown[i];
            if (!s) return;
            forget();
            input.value = s.label;
            hideList();
            error.hidden = true;
            if (opts.onPick) opts.onPick(s);
        }

        // Answers are kept for the page's life; only the latest question's answer is shown
        function ask(query) {
            if (Object.prototype.hasOwnProperty.call(cache, query)) { showList(cache[query]); return; }
            var mine = ++asked;
            Promise.resolve(opts.suggest(query)).then(function (suggestions) {
                cache[query] = suggestions || [];
                if (mine === asked) showList(cache[query]);
            }, function () {
                if (mine === asked) hideList();        // no service: no list, Enter still searches
            });
        }

        input.addEventListener("input", function () {
            forget();
            var query = input.value.trim();
            if (!opts.suggest || query.length < MIN_CHARS) { hideList(); return; }
            timer = setTimeout(function () { timer = null; ask(query); }, DELAY_MS);
        });

        input.addEventListener("keydown", function (e) {
            if (!listShown()) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                var n = shown.length;
                setActive(e.key === "ArrowDown" ? (active + 1) % n : (active <= 0 ? n : active) - 1);
            } else if (e.key === "Enter" && active >= 0) {
                e.preventDefault();
                pick(active);
            }
        });

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var query = input.value.trim();
            if (!query) return;
            forget();
            hideList();
            error.hidden = true;
            if (opts.onSearch) opts.onSearch(query);
        });

        // -- opening and closing ----------------------------------------------------------------------------------------

        var open = false;
        function setOpen(value) {
            open = value;
            panel.hidden = !value;
            button.setAttribute("aria-expanded", String(value));
            element.classList.toggle("open", value);
            if (value) input.focus();
            else { forget(); hideList(); }
        }
        button.addEventListener("click", function (e) { e.stopPropagation(); setOpen(!open); });
        // A click anywhere else closes it - same convention as the layers panel. A picked suggestion is gone from the
        // page by the time its click gets here: not a click elsewhere
        doc.addEventListener("click", function (e) {
            if (open && !element.contains(e.target) && doc.documentElement.contains(e.target)) setOpen(false);
        });
        // Escape closes the list, then the panel, and goes no further: not to a dialog the map is in (hence the capture
        // phase, before the dialog hears it)
        doc.addEventListener("keydown", function (e) {
            if (!open || e.key !== "Escape" || !doc.documentElement.contains(element)) return;
            e.preventDefault();
            e.stopPropagation();
            if (listShown()) hideList(); else setOpen(false);
        }, true);

        return {
            element: element,
            setLoading: function (loading) {
                submit.disabled = !!loading;
                submit.innerHTML = loading ? '<i class="fa fa-circle-notch fa-spin"></i>' : '<i class="fa fa-search"></i>';
            },
            setError: function (message) { error.textContent = message || ""; error.hidden = !message; },
            open: function () { setOpen(true); },
            close: function () { setOpen(false); },
            isOpen: function () { return open; }
        };
    }

    var api = {createSearchPanel: createSearchPanel};
    root.GeoJsonSearch = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : {});
