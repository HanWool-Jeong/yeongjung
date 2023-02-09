export class CommandError extends Error {
    constructor(message) {
        super(message);
        this.name = "CommandError";
    }
}

export class ImageSaveFailedError extends Error {
    constructor(message) {
        super(message);
        this.name = "ImageSaveFailedError";
    }
}