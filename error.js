export function CommandError(message)
{
    this.name = "CommandError";
    this.message = message;
}
CommandError.prototype = new Error();
CommandError.prototype.constructor = CommandError;

// 현재 사용안함
export function ImageSaveFailedError(message)
{
    this.name = "ImageSaveFailedError";
    this.message = message;
}
ImageSaveFailedError.prototype = new Error();
ImageSaveFailedError.prototype.constructor = ImageSaveFailedError;