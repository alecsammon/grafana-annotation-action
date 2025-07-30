const core = require('@actions/core');
const fetch = require('node-fetch'); // For making HTTP requests


/**
 * Makes an HTTP request to the Grafana API with exponential backoff retry logic.
 * @param {string} url The full URL for the Grafana API endpoint.
 * @param {string} method The HTTP method (e.g., 'POST', 'PUT').
 * @param {object} payload The JSON payload to send in the request body.
 * @param {string} apiKey The Grafana API key.
 * @returns {Promise<{success: boolean, status: number, body: object|null}>} Request result.
 */
const makeGrafanaApiRequest = async (url, method, payload, apiKey) => {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            let responseBody;

            try {
                responseBody = await response.json();
            } catch (error) {
                core.error(`Failed to parse JSON response: ${error.message}`);
                return null;
            }

            core.info(`Grafana API Response Status: ${response.status}`);
            core.debug(`Grafana API Response Body: ${JSON.stringify(responseBody, null, 2)}`);

            if (response.ok) {
                return {success: true, status: response.status, body: responseBody};
            } else {
                core.warning(`Grafana API call failed (attempt ${attempt + 1}): HTTP ${response.status} - ${response.statusText}`);
                if (responseBody && responseBody.message) {
                    core.warning(`Error message from Grafana: ${responseBody.message}`);
                }
            }
        } catch (error) {
            core.warning(`Grafana API call failed (attempt ${attempt + 1}): ${error.message}`);
        }

        attempt++;
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        core.info(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    return {success: false, status: -1, body: null}; // Indicate failure after retries
};

module.exports = {
    makeGrafanaApiRequest
};
