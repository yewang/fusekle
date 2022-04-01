const debug = window.location.href.includes("debug=true");
const clearStorage = window.location.href.includes("clearStorage=true");
var oneColor = storageLoad('oneColor') === null ? true : storageLoad('oneColor');
var circles = ["👟","🦶","🧦"];
const GREEN = "👟";
const WHITE = "🦶";
const YELLOW = "🧦";
const TODAY = new Date();
const START = new Date(2022, 1, 19);

function toggleOneColor() {
    storageSave('oneColor', !oneColor);
    window.location.reload();
}

/* functions for emoji support detection */
function supportsEmoji (e) {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.canvas.width = ctx.canvas.height = 1;
    ctx.fillText(e, -4, 4);
    return ctx.getImageData(0, 0, 1, 1).data[3] > 0; // Not a transparent pixel
}
function supportsAll(emojis) {
    for (var i = 0; i < emojis.length; i++) {
        var e = emojis[i];
        if (!supportsEmoji(e)) {
            return false;
        }
    }
    return true;
}
const CIRCLES = supportsAll(circles);

/* daily puzzle */
function getNumber() {
    const re=/puzzle=(\d+)/;
    var m;
    if ((m = window.location.href.match(re)) && m.length > 1) {
        return parseInt(m[1]);
    }
    const dayMillis = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    return Math.ceil(Math.abs((START - TODAY) / dayMillis));
}
const PUZZLE_NUMBER = getNumber();

function createRand(seed) {
    var m = 134456;
    var a = 8121;
    var c = 28411;

    var z = seed || 42;
    return function() {
        z = (a * z + c) % m;
        return z;
    };
}

function getSolution() {
    var rand,
        puzzle,
        i, a, b, c;

    if (PUZZLE_NUMBER >= puzzles.length) {
        rand = createRand(Math.floor(PUZZLE_NUMBER / puzzles.length))
        puzzles = shuffle(puzzles);
    }
    puzzle = puzzles[PUZZLE_NUMBER % puzzles.length];

    rand = createRand(PUZZLE_NUMBER); // Reinit for puzzle flip
    // Flip three coins for random reorientation
    a = rand() % 2;
    b = rand() % 2;
    c = rand() % 2;
    for (i = 0; i < puzzle.length; i++) {
        if (a) { // Mirror x axis
            puzzle[i].x = 10 - puzzle[i].x;
        }
        if (b) { // Mirror y axis
            puzzle[i].y = 10 - puzzle[i].y;
        }
        if (c) { // Transpose
            puzzle[i].x, puzzle[i].y = puzzle[i].y, puzzle[i].x
        }
    }

    function shuffle(array) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = rand() % currentIndex;
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    return puzzle;
}
const solution = getSolution();

function getTitle(n) {
    if (typeof n === "undefined") {
        n = 0;
    }
    var title = "Fu🧦le #" + (PUZZLE_NUMBER + n);
    title += " (" + solution.length + " moves";
    if (!oneColor) {
        title += ", blind start";
    }
    title += ")";
    return title;
}


/* functions to get inputted sequence from besogo */
function extractMovesFrom(current) {
    var moves=[];
    if (current.submitted) {
        showPopup("Already submitted");
        return [];
    }
    while (current.move !== null) {
        moves.push({x:current.move.x, y:current.move.y});
        current=current.parent;
    }
    return moves.reverse();
}
function getInputEditor() {
    return document.querySelector("#input-board").editor;
}
function extractMoves() {
    var inputBoard=document.querySelector("#input-board");
    var current=inputBoard.editor.getCurrent();
    return extractMovesFrom(current);
}
function pretty_print(moves) {
    return moves.map(move => move.x+"-"+move.y).join(", ");
}

/* functions to handle inputted guesses and update state on success */
function wasCorrect(hints, solution) {
    // Considers guess to be correct if the solution is a prefix
    for (i=0; i < hints.length && i < solution.length; i++) {
        if (hints[i]===YELLOW || hints[i]===WHITE) {
            return false;
        }
    }
    return solution.length <= hints.length;
}
function share() {
    var text = getTitle() + "\n";
    text += guesses.map(guess => guess.join("")).join("\n");
    text += "\n";
    text += "https://yewang.github.io/fusekle/";
    navigator.clipboard.writeText(text);
    showPopup("Copied to clipboard");
}
function makeButton(value, title, onclick) {
    element = document.createElement('input');
    element.type = 'button';
    element.value = value;
    element.title = title;
    element.onclick = onclick;
    return element;
}
function scrollHints() {
    document.querySelector(".besogo-hint").scrollTop = document.querySelector(".besogo-hint").scrollHeight;
}
function toggleButtons() {
    document.querySelector('#output').appendChild(
        makeButton("Share", "Copy results to clipboard", share)
    );
    document.querySelector('#Submit').classList.add("hidden");
}
function display(hints, message) {
    var output = document.querySelector("#output");
    var p = document.createElement("p");
    if (CIRCLES) {
        p.innerText = hints + " " + message;
        output.appendChild(p);
    } else {
        var rest = [];
        var split = [...hints];
        split.forEach(c => {
            if (c === YELLOW) {
                var img = document.createElement("img");
                img.src = "img/emojis/yellow.png";
                p.appendChild(img);
            } else if (c === GREEN) {
                var img = document.createElement("img");
                img.src = "img/emojis/green.png";
                p.appendChild(img);
            } else if (c === WHITE) {
                var img = document.createElement("img");
                img.src = "img/emojis/white.png";
                p.appendChild(img);
            } else {
                rest.push(c);
            }
        });
        p.innerHTML += " " + message;
        output.appendChild(p);
    }
    scrollHints();
}

function showPopup(text) {
    var popup = document.querySelector("#notify");
    popup.classList.add("active");
    document.getElementById('notify-text').innerText = text;
    setTimeout(function(){
        popup.classList.remove("active");
    }, 1200);
}

function submit() {
    var moves = extractMoves();
    if (moves.length === 0) {
        return;
    }
    if (moves.length > solution.length) {
        showPopup("Too many moves");
        return;
    }
    var hints = getInputEditor().check(solution);
    if (debug) {
        console.log("guess: " + pretty_print(moves));
        console.log("solution: " + pretty_print(solution));
        console.log(hints);
    }
    submissions.push(moves);
    guesses.push(hints);
    var message = "";
    if (moves.length < solution.length) {
        message = "Too few moves";
    }
    const solved = wasCorrect(hints, solution);
    if (solved) {
        if (hints.length > solution.length) {
            message = "Good Enough!";
        } else {
            switch(guesses.length) {
                case 1:
                    message = "Genius";
                    break;
                case 2:
                    message = "Magnificent";
                    break;
                case 3:
                    message = "Impressive";
                    break;
                case 4:
                    message = "Splendid";
                    break;
                case 5:
                    message = "Great";
                    break;
                default:
                    message = "Phew";
            }
        }
    }
    storageSave(getTitle(),{
        submissions: submissions,
        solved: solved,
    });
    display(hints.join(""), message);
    if (solved) {
        toggleButtons();
        scrollHints();
    }
}

function startOneColorMode() {
    const editor = getInputEditor();
    for (var i = solution.length - 1; i >= 0; i--) {
        var move = solution[i];
        editor.getRoot().addMarkup(move.x, move.y, 2);
    }
    editor.setVariantStyle(editor.getVariantStyle()); // toggles a redraw
}

/* functions to save and restore previous attempts */
function storageSave(key, val) {
    if (localStorage) {
        localStorage.setItem(key, JSON.stringify(val));
    }
}
function storageLoad(key) {
    if (localStorage) {
        const json = localStorage.getItem(key);
        if (json) {
            return JSON.parse(json);
        }
    }
    return null;
}
function storageClear(key) {
    if (localStorage) {
        if (key) {
            localStorage.removeItem(key);
        } else {
            localStorage.clear();
        }
    }
}
function tryRestore() {
    const dark = storageLoad("dark");
    if (dark === "on") {
        document.querySelector('button[title="Toggle dark theme"]').click();
    }
    const saved = storageLoad(getTitle());
    if (saved && saved["submissions"] !== null && saved["submissions"].length > 0) {
        const submissions = saved["submissions"];
        const editor = getInputEditor();
        for (var i = 0; i < submissions.length; i++) {
            const submission = submissions[i];
            submission.forEach(move => {
                editor.click(move.x, move.y, false, false);
            });
            submit();
            // after replaying each but the last, reset to root to keep replaying:
            if (i < submissions.length - 1) {
                editor.prevNode(-1);
            } else {
                // for the last replay, if unsolved, also reset
                // if solved, will not reset to display the solution
                if (!saved["solved"]) {
                    editor.prevNode(-1);
                }
            }
        };
        return true;
    } else {
        storageClear(getTitle(-1));
    }
    return false;
}
const submissions = [];
const guesses = [];
window.onload = function() {
    if (clearStorage) {
        localStorage.clear();
    }
    besogo.autoInit();
    initModal();
    document.querySelector("div#title").innerText=getTitle();
    getInputEditor().addListener(function(msg) {
        if (msg.dark === false || msg.dark === true) {
            const value = msg.dark ? "on" : "off";
            storageSave("dark", value);
        }
    })
    if (oneColor) {
        startOneColorMode();
    }
    tryRestore();
};
