/**
 * @type {HTMLInputElement}
 */
const connectionInputElement = document.getElementById("connection-input");
/**
 * @type {HTMLDivElement}
 */
const connectionStateElement = document.getElementById("connection-state");
/**
 * @type {HTMLDivElement}
 */
const connectionIdElement = document.getElementById("identifier");
/**
 * @type {HTMLInputElement}
 */
const fileInputElement = document.getElementById("file-input");
/**
 * @type {HTMLButtonElement}
 */
const sendFilesButton = document.getElementById("send-files");
/**
 * @type {HTMLDivElement}
 */
const previewElement = document.getElementById("preview");
/**
 * @type {HTMLDivElement}
 */
const historyElement = document.getElementById("history");
/**
 * @type {HTMLDivElement}
 */
const messageElement = document.getElementById("messages");
/**
 * @type {HTMLButtonElement}
 */
const sendMessageButton = document.getElementById("send-message");
/**
 * @type {HTMLInputElement}
 */
const messageInputElement = document.getElementById("message");
/**
 * @type {HTMLInputElement}
 */
const usernameInputElement = document.getElementById("username");

const Events = {
    "receive:message": "receive:message",
    "receive:folder": "receive:folder",
    "status:query": "status:query",
    "status:online": "status:online",
    "status:offline": "status:offline",
    "send:message": "send:message",
    "send:folder": "send:folder",
};

const socket = io();

/**
 * @param {Message} message
 */
function receiveMessage(message) {
    if (!connectionInputElement.value.length) {
        connectionInputElement.value = message.from;
    }

    messageElement.innerHTML += `<div>
        <strong>${message.name}</strong>
        <span>${message.text}</span>
    </div>`;
}

/**
 * @param {Message} message
 */
function sendMessage(message) {
    socket.emit(Events["send:message"], message);
    receiveMessage(message);
}

/**
 * @param {Folder} folder
 */
async function receiveFolder({ files }) {
    for (const filename in files) {
        const storage = (await openDataBase("dss")).transaction(["files"], "readwrite").objectStore("files");
        storage.add(files[filename]);
    }

    await loadFilesFromDatabase();
}

/**
 * @param {Folder} folder
 */
function sendFolder(folder) {
    socket.emit(Events["send:folder"], folder);
}

/**
 * @param {string} status
 */
function updateState(status) {
    connectionStateElement.innerHTML = status;
}

socket.on(Events["receive:message"], (message) => {
    receiveMessage(message);
});

socket.on(Events["receive:folder"], (folder) => {
    receiveFolder(folder);
});

socket.on(Events["status:offline"], () => {
    updateState("Desemparejado");
});

socket.on(Events["status:online"], () => {
    updateState("Emparejado");
});

socket.on("connect", () => {
    connectionIdElement.innerHTML = socket.id;
});

/**
 * @param {((progress:number) => void)|undefined} progress
 * @returns {Promise<Folder["files"]>}
 */
async function getFiles(progress) {
    const files = {};

    for (const file of Array.from(fileInputElement.files)) {
        files[file.name] = await readFile(file, progress);
    }

    return files;
}

/**
 * @param {File} file
 * @param {((progress:number) => void)|undefined} progress
 * @returns {Promise<Archive>}
 */
function readFile(file, progress) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.addEventListener("progress", (e) => {
            if (progress) progress(parseInt((e.loaded / e.total) * 100, 10));
        });

        reader.addEventListener("load", (e) => {
            resolve({
                body: e.target.result.toString(),
                type: file.type,
                name: file.name,
                size: file.size,
            });
        });

        reader.addEventListener("error", (e) => {
            reject(e);
        });

        const blob = new Blob([file], file);

        if (/(image|video|audio|application\/pdf|application\/x-msdownload)/.test(file.type)) {
            reader.readAsDataURL(blob);
        }

        if (/(text\/plain)/.test(file.type)) {
            reader.readAsText(blob);
        }
    });
}

/**
 * @param {Archive} file
 * @returns {HTMLElement}
 */
function previewFile(file) {
    switch (file.type) {
        case "application/x-msdownload":
        case "application/pdf": {
            const link = document.createElement("a");

            link.innerHTML = file.name;
            link.download = file.name;
            link.href = file.body;

            link.classList.add("a");

            return link;
        }

        case "video/webp":
        case "video/mp4": {
            const video = document.createElement("video");

            video.controls = true;
            video.src = file.body;

            video.classList.add("video");

            return video;
        }

        case "audio/mp3":
        case "audio/ogg":
        case "audio/wav": {
            const audio = document.createElement("audio");

            audio.controls = true;
            audio.src = file.body;

            return audio;
        }

        case "image/webp":
        case "image/jpeg":
        case "image/jpg":
        case "image/png":
        case "image/gif": {
            const image = document.createElement("img");

            image.src = file.body;

            image.classList.add("image");

            return image;
        }

        case "text/plain": {
            const p = document.createElement("p");

            p.innerHTML = file.body;

            return p;
        }

        default: {
            const p = document.createElement("p");

            p.innerHTML = file.body;

            return p;
        }
    }
}

/**
 * @param {string} name
 * @returns {Promise<IDBDatabase>}
 */
function openDataBase(name) {
    return new Promise((resolve, reject) => {
        const _db = window.indexedDB.open(name);

        _db.addEventListener("upgradeneeded", (e) => {
            _db.result.createObjectStore("messages", {
                keyPath: "name",
            });

            _db.result.createObjectStore("files", {
                keyPath: "name",
            });

            resolve(_db.result);
        });

        _db.addEventListener("success", (e) => {
            resolve(_db.result);
        });

        _db.addEventListener("error", (e) => {
            reject(e);
        });
    });
}

/**
 * @param {string} name
 * @param {string} store
 * @param {Archive} file
 */
async function addToDataBase(name, store, file) {
    (await openDataBase(name)).transaction([store], "readwrite").objectStore(store).add(file);
}

/**
 * @param {string} name
 * @param {string} store
 */
async function getCursor(name, store) {
    return (await openDataBase(name)).transaction([store], "readonly").objectStore(store).openCursor();
}

/*
 * Loaders
 */

async function loadFilesFromDatabase() {
    const fragment = document.createDocumentFragment();
    const cursor = await getCursor("dss", "files");

    cursor.addEventListener("success", () => {
        if (cursor?.result) {
            fragment.appendChild(previewFile(cursor.result.value));
            cursor.result.continue();
        } else {
            historyElement.appendChild(fragment);
        }
    });
}
/*
 * Events
 */
sendFilesButton.addEventListener("click", async () => {
    sendFolder({ name: usernameInputElement.value, to: connectionInputElement.value, files: await getFiles() });
});

fileInputElement.addEventListener("change", async () => {
    const files = await getFiles();

    previewElement.innerHTML = "";

    for (const filename in files) {
        previewElement.appendChild(previewFile(files[filename]));
    }
});

sendMessageButton.addEventListener("click", () => {
    if (!connectionInputElement.value.length) return alert("Necesitas un id primero");

    sendMessage({ name: usernameInputElement.value, to: connectionInputElement.value, text: messageInputElement.value, from: socket.id });
});

usernameInputElement.addEventListener("input", () => {
    localStorage.setItem("dss:username", usernameInputElement.value);
});

window.addEventListener("load", async () => {
    await loadFilesFromDatabase();

    usernameInputElement.value = localStorage.getItem("dss:username") ?? "";
});

window.addEventListener("beforeunload", () => {
    socket.disconnect();
});

/*
 * Watchers
 */
setInterval(() => {
    socket.emit(Events["status:query"], connectionInputElement.value);
}, 500);
