// background.js
const URLs = /\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g;
let port = null;
let scanOutput = ""; // Store all BBOT output persistently while Firefox is running
let hosts = new Set(); // Store unique scan targets
function connectNative() {
    port = browser.runtime.connectNative("bbot_host");

    port.onMessage.addListener((message) => {
        if (message.type === "scanResult") {
            scanOutput += message.data + "\n"; // Append scan results
            browser.runtime.sendMessage({ type: "updateOutput", data: scanOutput }); // Send updated output to popup
        } else if (message.type === "error") {
            scanOutput += `[ERROR] ${message.data}\n`;
            browser.runtime.sendMessage({ type: "updateOutput", data: scanOutput });
        }
    });

    port.onDisconnect.addListener(() => {
        console.log("Disconnected from bbot_host");
        port = null;
    });
}

function extractInfo(scanOutput) {
    console.log("Raw Scan Output:", scanOutput); // Log full output
    
    const markers = scanOutput.match(URLs) || []; 
    const uniqueMarkers = [...new Set(markers)]; 
    
    console.log("Extracted Markers (Unique):", uniqueMarkers);
    
    return { markers: uniqueMarkers };
}



connectNative();


browser.runtime.onMessage.addListener((msg) => {
    if (!port) {
        connectNative();
    }


    if (msg.type === "runScan") {
        // Add target to hosts list
        hosts.add(msg.target);

        // Ensure eventType defaults to "*"
        const eventType = msg.eventType ? msg.eventType : "*";

        port.postMessage({
            command: "scan",
            target: msg.target,
            scantype: msg.scanType,
            deadly: msg.deadly,
            eventtype: eventType,
            moddep: msg.moddep,
            flagtype:msg.flagType,
            burp: msg.burp,
            viewtype: msg.viewtype,
            scope: msg.scope
        });
    } else if (msg.type === "getOutput") {
        browser.runtime.sendMessage({ type: "updateOutput", data: scanOutput }); // Send stored output to popup
    } else if (msg.type === "getHosts") {
        browser.runtime.sendMessage({ type: "updateHosts", data: Array.from(hosts).join('\n') }); // Send list of scanned hosts
    } else if (msg.type === "clearOutput") {
        scanOutput = ""; // Clear stored output
        browser.runtime.sendMessage({ type: "updateOutput", data: scanOutput }); // Notify popup
    } else if (msg.type === "clearHosts") {
        hosts.clear(); // Clear stored hosts
        browser.runtime.sendMessage({ type: "updateHosts", data: "" }); // Notify popup
    } else if (msg.type === "getURLS") {
        const extractedData = extractInfo(scanOutput);
        let formattedOutput = `Extracted Markers:\n${extractedData.markers.join('\n')}`;
        console.log("Extracted Data Sent:", formattedOutput); // Debugging log
        browser.runtime.sendMessage({ type: "updateOutput", data: formattedOutput });
    }
});
