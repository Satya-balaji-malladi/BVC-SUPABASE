var TestResult = {

    pass: function (name, message) {

        return {

            success: true,

            name: name,

            message: message

        };

    },

    fail: function (name, message, error) {

        return {

            success: false,

            name: name,

            message: message,

            error: error

        };

    }

};