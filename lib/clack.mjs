import { isCancel, outro } from '@clack/prompts';
import chalk from 'chalk';

/**
 * * Show cancel message with outro and graceful exit
 * @param {string} [message] Optional message to display
 */
export function showCancelMessage(message) {
	outro(chalk.redBright(message || '🛑 Process cancelled by user!'));
	process.exit(0);
}

/**
 * * Normalize clack result to string
 * @param {string | symbol} result
 * @returns {string}
 */
export function normalizeStringResult(result) {
	if (isCancel(result)) {
		outro(chalk.redBright('🛑 Process cancelled by user!'));
		process.exit(0);
	}

	return result?.trim();
}

/**
 * * Normalize clack result to boolean
 * @param {boolean | symbol} result
 * @returns {boolean}
 */
export function normalizeBooleanResult(result) {
	if (isCancel(result)) {
		outro(chalk.redBright('🛑 Process cancelled by user!'));
		process.exit(0);
	}

	return result;
}

/**
 * * Mimic clack left vertical line before a message
 * @param {string} message message to print
 * @param {boolean} [suffix=false] If true, adds a pipe in new line
 */
export function mimicClack(message, suffix = false) {
	console.log(
		chalk.gray('│\n') + chalk.green('◇  ') + message + (suffix ? chalk.gray('\n│') : '')
	);
}

/**
 * * Add a left pipe character to a message
 * @param {string} [message] message to format
 * @returns {string} Formatted message with left pipe
 */
export function addPipeOnLeft(message = '') {
	return `${chalk.gray('│')}  ${message}`;
}

/**
 * * Validate string input using clack
 * @param {string} input input to validate
 * @param {string} [errorMessage] optional error message to return if validation fails
 */
export function validateStringInput(input, errorMessage) {
	if (typeof input !== 'string' || !input.trim()) {
		return errorMessage || '🛑 Cannot be left empty!';
	}
}
