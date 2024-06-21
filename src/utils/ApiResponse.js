class ApiRespone {
    constructor (statusCode, data, message="Success") {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = successCode < 400
    }
}

export { ApiRespone }