// This file is required by the index.html file and will
// be executed in the renderer process for that window
// All of the Node.js APIs are available in this process

const { ipcRenderer } = require('electron')
const hidebtn = document.getElementById('hidebtn')
const timeout = document.getElementById('timeout')
const timedrop = document.getElementById('timedrop')

hidebtn.addEventListener('click', function() {
    ipcRenderer.send('hide_window', timeout.value, timedrop.selectedIndex)
}, false)
