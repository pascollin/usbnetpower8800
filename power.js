#!/usr/bin/env node
"use strict";

/* 
Copyright (C) 2011  Paul Marks  http://www.pmarks.net/
Copyright (C) 2020 Pascollin

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Project original homepage: http://code.google.com/p/usbnetpower8800/
Project node homepage : https://www.npmjs.com/package/usbnetpower8800/

This is a simple command-line tool for controlling the "USB Net Power 8800"
from Linux (etc.) using Node and USB.  It shows up under lsusb as:

    ID 067b:2303 Prolific Technology, Inc. PL2303 Serial Port

But, from what one can tell, none of the serial port features are ever used,
and all you really need is one USB control transfer for reading the current
state, and another for setting it.

The device is basically a box with a USB port and a switchable power outlet.
It has the unfortunate property that disconnecting it from USB immediately
kills the power, which reduces its usefulness.

To install run :
 $ sudo npm -g install usbnetpower8800
 $ sudo ln -s /lib ...

If you have a permission error using the script and udev is used on your
system, it can be used to apply the correct permissions. Example:
 $ cat /etc/udev/rules.d/51-usbpower.rules
 SUBSYSTEM=="usb", ATTR{idVendor}=="067b", MODE="0666", GROUP="plugdev"
*/

const usb = require("usb");
const process = require("process");

class Power {
  constructor() {
    this._device = usb.findByIds(0x067b, 0x2303);
    this._device.open();
  }
  getState(callback) {
    this._device.controlTransfer(0xc0, 0x01, 0x0081, 0x0000, 0x0001, (err, buffer) => {
      if (err) callback(console.error(err));
      else callback(Array.from(buffer).pop() === 0xa0);
    });
  }
  setState(state, callback) {
    const code = state ? 0xa0 : 0x20;
    this._device.controlTransfer(0x40, 0x01, 0x0001, code, Buffer.from([]), callback);
  }
}

function main(args) {
  const power = new Power();
  const [program, command] = args;
  const log = (err) => (err ? console.error(`Command failed ${err}`) : console.log("Command succeed"));
  const status = (state) => {
    console.log(`Power : ${state ? "On" : "Off"}`);
    process.exit(state ? 0 : 1);
  };
  switch (command) {
    case "on":
      power.setState(true, log);
      break;
    case "off":
      power.setState(false, log);
      break;
    case "toggle":
      power.getState((state) => power.setState(!state, log));
      break;
    case "query":
      power.getState(status);
      break;
    case "reboot":
      power.setState(false, () => setTimeout(() => power.setState(true, log), 5000));
      break;
    default:
      const usage = `Controller for the USB Net Power 8800\n\Usage: ${program} on|off|toggle|query|reboot`;
      console.log(usage);
  }
}

if (require.main === module) main(process.argv.slice(1));
else module.exports = Power;
