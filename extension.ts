/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/


import { BlobOptions } from 'buffer';
import { diffieHellman } from 'crypto';
import { fstat, writeFile } from 'fs';
import { Context } from 'mocha';
import { stringify } from 'querystring';
import { isAnyArrayBuffer } from 'util/types';
import * as vscode from 'vscode';

let myStatusBarItem: vscode.StatusBarItem;
export function activate(context: vscode.ExtensionContext) {
	const bryclock = "bryclock";
	const bry_timer = "bryclock.timer";
	const bry_restart = "restart bryclock";
	const bry_save_timer = "save brytimer";
	const bry_load_timer = "load timer";

	var timer_file: vscode.Uri;
	let lastTimer: string = "n/a";
	//use to capture setinterval() id that it returns, any value due to 2 different implemntions of the function exist
	//with different return types
	let intervalId: any;

	// create a new status bar item that we can now manage
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	myStatusBarItem.command = bryclock;

	vscode.commands.registerCommand(bryclock, async () => {
		const timer = "Set timer";
		const clock = "Resume clock";
		const save_timer = "Save timer";
		const selection = await vscode.window.showInformationMessage('Bryclock actions:',
			timer, clock, save_timer, bry_load_timer);

		if (selection !== undefined) {
			switch (selection) {
				case timer:
					vscode.commands.executeCommand(bry_timer);
					break;
				case clock:
					vscode.commands.executeCommand(bry_restart);
					break;
				case save_timer:
					vscode.commands.executeCommand(bry_save_timer);
					break;
				case bry_load_timer:
					vscode.commands.executeCommand(bry_load_timer);
			}

		}

	});
	vscode.commands.registerCommand(bry_load_timer, async () => {
		//get the ascii values
		var last_time = await vscode.workspace.fs.readFile(timer_file)
		//once last_time has gotten the files
		let saved_time: string = "";
		if (last_time !== undefined) {

			for (var i = 0; i < last_time.length; i++) {
				//ignore spaces
				if (String.fromCharCode(last_time[i]) == " ") continue;
				//convets ascii values to characters
				saved_time += String.fromCharCode(last_time[i]);
			}
			vscode.window.showInformationMessage("saved_time:" + (saved_time));
			//stop clock from running
			clearInterval(intervalId);
			timer(saved_time, myStatusBarItem);
		}
	});
	// register a command that is invoked when the status bar item is selected
	vscode.commands.registerCommand(bry_timer, async () => {
		//input box to get timer information
		//repeats until usable input is submitted
		do {
			var input = await vscode.window.showInputBox({ placeHolder: "input \"HH:MM:SS\"" });
			var checkflag = 0;
			//once the input is received 
			if (input !== undefined) {
				//checks the input to see if it is in the specified format and made of valid characters
				checkflag = checkinput(input);
			}
			//while not valid, loop
		} while (checkflag == 0)
		//once input is received
		if (input !== undefined) {
			clearInterval(intervalId);
			lastTimer = input;
			timer(input, myStatusBarItem);
		}
	});
	vscode.commands.registerCommand(bry_restart, () => {
		intervalId = setInterval(Updateclock, 1000, myStatusBarItem);
	});
	vscode.commands.registerCommand(bry_save_timer, async() => {
		vscode.window.showInformationMessage("Saved timer: " + lastTimer);
        var input = await vscode.window.showInputBox({ placeHolder: "input file directory, text file \"lastTimer\" will be created @ directory"});

		if (input !== undefined) {
			//splits the file directory, into individal strings
			let splitIn = input.split("\\");
			let filepath:string = "";
			for(let num = 0; num < splitIn.length;num++)
			{
				//add double slash to escape the slashes
				splitIn[num] += "\\";
				filepath += splitIn[num];
			}
			//adds textfile to directory
			filepath += "lastTimer.txt";
			timer_file = vscode.Uri.file(filepath);
			let hours: number;
			//To store the 2nd digit, if there is not one default to space(space are ignored by load time function)
			let hours2nd: number = 32;
			let minutes: number;
			let minutes2nd: number = 32;
			let seconds: number;
			let seconds2nd: number = 32;

			let parsed = lastTimer.split(":", 3);
			//converting numbers to ascii values, 0 starts at decimal 48
			//if to handle edge case if the numerical value is 10
			if (parsed[0] == '10') {
				hours = 49;
				hours2nd = 48;
			}
			else
				hours = parseInt(parsed[0]) + 48;
			if (parsed[1] == "10") {
				minutes = 49;
				minutes2nd = 48;
			}
			else
				minutes = parseInt(parsed[1]) + 48;
			if (parsed[2] == "10") {
				seconds = 49;
				seconds2nd = 48;
			}
			else
				seconds = parseInt(parsed[2]) + 48;
			//colon is ascii value of decimal 58
			let colon = 58;
			let test = new Uint8Array();

			test = Uint8Array.of(hours, hours2nd, colon, minutes, minutes2nd, colon, seconds, seconds2nd)
			vscode.workspace.fs.writeFile(timer_file, test);
		}

	});

	// updates clock every second, potential error margin of 1 second + code exe time in worst case
	intervalId = setInterval(Updateclock, 1000, myStatusBarItem);
}
//Updates the clock on status bar once call
function Updateclock(mybar: any): void {
	print(new Date().toLocaleTimeString(), mybar);
}
//prints str to status bar
function print(str: string, barItem: any) {
	barItem.text = str;
	barItem.show();
}
//Handles the timer
function timer(input: string, mybar: any): void {
	//breaks input into an array, [0]:hours,[1]:minutes,[2]seconds
	let parsed = input.split(":", 3);
	//unary + converts string to number(there is no int in typescript/javascript)
	let countdown = new count(+parsed[0], +parsed[1], +parsed[2], mybar);
	countdown.run();
}
//class to manage the timer coutdown
class count {
	H: number;
	M: number;
	S: number
	mybar: any;
	constructor(H: number, M: number, S: number, bar: any) {
		this.H = H;
		this.M = M;
		this.S = S;
		this.mybar = bar;
	}
	run(): void {
		//vscode.window.showInformationMessage("Running!");
		let intervalId_run = setInterval(() => {

			print(this.H + ":" + this.M + ":" + this.S, this.mybar);

			if (this.S > 0) {
				this.S -= 1;

			}
			else if (this.M > 0) {
				this.M -= 1;
				this.S = 60;
			}
			else if (this.H > 0) {
				this.H -= 1;
				this.M = 60;
			}
			//if timer is done, stop repeating this function
			else if (this.H <= 0 && this.M <= 0 && this.S <= 0) {
				vscode.window.showWarningMessage("*DING* timer done! Click timer/clock for more options", { modal: true });
				clearInterval(intervalId_run);
			}
		}, 1000);
	}
}
//checks the input is in the specified format and valid characters
function checkinput(input: string): number {
	var checksum = 0;
	var check = "0123456789";

	//check the format and characters of the input to ensure it what is expected
	for (let i = 0; i < input.length; i++) {
		if (i == 2) {
			if (input.charAt(2) == ":")
				checksum += 1;
		}
		if (i == 5) {
			if (input.charAt(5) == ":")
				checksum += 1;
		}
		for (let j = 0; j < check.length; j++) {
			if (input.charAt(i) == check.charAt(j)) {
				checksum += 1;
			}
		}
	}
	//if there are exactly 8 properly formatted characters
	if (checksum == 8)
		return 1;
	else {
		vscode.window.showWarningMessage("Please enter specified format, including zeros and colons: \"HH:MM:SS\"");
		return 0;
	}
	return checksum;
}
export function deactivate() { }
