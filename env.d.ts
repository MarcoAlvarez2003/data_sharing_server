export declare global {
    export namespace NodeJS {
        export interface ProcessEnv {
            DEBUG?: string;
            HOST?: string;
            PORT?: string;
        }
    }

    export interface Message {
        /**
         * Content of message
         */
        text: string;
        /**
         * Name of user
         */
        name: string;
        /**
         * Message destination
         */
        to: string;
    }

    export interface Archive {
        /**
         * Define file content
         */
        body: string;
        /**
         * Define file type
         */
        type: string;
        /**
         * Name of file
         */
        name: string;
        /**
         * File size
         */
        size: number;
    }

    export interface Folder {
        /**
         * Data to transfer
         */
        files: Record<string, Archive>;
        /**
         * Name of user
         */
        name: string;
        /**
         * Id of user
         */
        from: string;
        /**
         * Data destination
         */
        to: string;
    }
}
