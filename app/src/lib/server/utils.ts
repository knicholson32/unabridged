import { EventEmitter } from 'events';
import { spawn, exec } from 'node:child_process';
import type { Readable } from 'node:stream';
import uuid from 'uuid';
import * as DataBase from '$lib/server/db';
import { OperationStatus, OperationType, type GenericOperationData } from '$lib/types';

export type ExecutionResult = {
    code: number;
    stdout: string;
    stderr: string;
};


export class Operation {
    public id: string;
    private _active: boolean;
    
    constructor(type: OperationType) {
        this.id = uuid.v4();
        this._active = true;;

        DataBase.operationStore[this.id] = {
            status: OperationStatus.Active,
            progress: 0,
            type: type,
            id: this.id
        }
    }

    async execute(func: (op: Operation) => Promise<any>): Promise<any> {
        const resp =  await func(this);
        this.finish();
        return resp;
    }

    get data() {
        return DataBase.operationStore[this.id] as GenericOperationData;
    }

    finish() {
        this._active = false;
        DataBase.operationStore[this.id].status = OperationStatus.Done;

        // Delete the operation from the 'database' in 10 seconds
        setTimeout(() => {
            console.log('Removing Done Operation', this.id);
            delete DataBase.operationStore[this.id];
        }, 10 * 1000);
    }

    get progress() {
        if (this._active) return DataBase.operationStore[this.id].progress;
        else return -1;
    }

    set progress(p: number) {
        if (this._active) DataBase.operationStore[this.id].progress = p || -1;
    }
}

const af = async (test: number): Promise<boolean> => {
    return false;
}

export class Exec extends EventEmitter {
    // Command to pass to the spawn method
    private _command: string;

    // Arguments to pass to the spawn method
    private _arguments: string[];

    // A reference to the spawn object created by the spawn method
    private _spawn: any;

    // Stringified outputs
    private _stdoutStr: string;
    private _stderrStr: string;

    // Timeout in miliseconds
    private _timeoutMs: number | undefined;

    constructor(command: string, args?: string | string[], timeout?: number) {
        super();

        this._command = command;

        if (args !== undefined) {
            if (typeof args === 'string') this._arguments = args.split(' ');
            else this._arguments = args;
        }

        this._timeoutMs = timeout;
        this._stdoutStr = '';
        this._stderrStr = '';
    }

    /**
     * Execute by setting up the spawn method and assigning event emitters
     */
    execute(): Promise<{ code: number; stdout: string; stderr: string }> {
        this._spawn = spawn(this._command, this._arguments);

        let timeout: NodeJS.Timeout | undefined;
        if (this._timeoutMs !== undefined) {
            timeout = setTimeout(() => {
                this.kill();
                this.emit('timeout', -1, this._stdoutStr, this._stderrStr);
            }, this._timeoutMs);
        }

        this._spawn.on('exit', (code: number) => {
            clearTimeout(timeout);
            this.emit('exit', code, this._stdoutStr, this._stderrStr);
        });

        this._spawn.stdout.on('data', (data: Readable) => {
            const str = data.toString();
            this._stdoutStr += str;

            this.emit('out_stream', data);
            this.emit('out', str);
        });

        this._spawn.stderr.on('data', (data: Readable) => {
            const str = data.toString();
            this._stderrStr += str;

            this.emit('err_stream', data);
            this.emit('err', str);
        });

        return new Promise<ExecutionResult>((resolve, reject) => {
            this.on('exit', (code: number, stdout: string, stderr: string) => {
                const payload = { code, stdout, stderr };
                if (code === 0) resolve(payload);
                else reject(payload);
            });

            this.on('timeout', (code: number, stdout: string, stderr: string) =>
                reject({ code, stdout, stderr })
            );
        });
    }

    /**
     * Force kill this execution
     */
    kill(): void {
        this._spawn.kill('SIGINT');
    }
}
