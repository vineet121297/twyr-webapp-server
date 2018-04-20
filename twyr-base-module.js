'use strict';

/**
 * Module dependencies, required for ALL Twyr' modules
 * @ignore
 */

/**
 * Module dependencies, required for this module
 * @ignore
 */
const TwyrBaseClass = require('./twyr-base-class').TwyrBaseClass,
	TwyrBaseError = require('./twyr-base-error').TwyrBaseError;

/**
 * @class   TwyrBaseModule
 * @extends {TwyrBaseClass}
 * @classdesc The Twyr Server Base Class for all Modules.
 *
 * @param   {TwyrBaseModule} [parent] - The parent module, if any.
 * @param   {TwyrModuleLoader} [loader] - The loader to be used for managing modules' lifecycle, if any.
 *
 * @description
 * Serves as the "base class" for all other classes in the Twyr Web Application Server, including {@link TwyrApplication}.
 * 1. Defines the "lifecycle" hooks - {@link TwyrBaseModule#load}, {@link TwyrBaseModule#initialize}, {@link TwyrBaseModule#start}, {@link TwyrBaseModule#stop}, {@link TwyrBaseModule#uninitialize}, and {@link TwyrBaseModule#unload}
 * + Defines the basic property - {@link TwyrBaseModule#dependencies}.
 *
 */
class TwyrBaseModule extends TwyrBaseClass {
	// #region Constructor
	constructor(parent, loader) {
		super();
		if(plntWrksEnv === 'development') console.log(`${this.name}::constructor`);

		if(!loader) {
			const TwyrModuleLoader = require('./twyr-module-loader').TwyrModuleLoader;
			loader = new TwyrModuleLoader(this);
		}

		Object.defineProperties(this, {
			'$parent': {
				'get': () => {
					return parent;
				}
			},

			'$loader': {
				'get': () => {
					return loader;
				}
			},

			'$locale': {
				'value': parent ? parent.$locale : 'en',
				'configurable': !parent
			}
		});
	}
	// #endregion

	// #region Lifecycle hooks
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     load
	 *
	 * @param    {ConfigurationService} configSrvc - Instance of the {@link ConfigurationService} that supplies configuration.
	 *
	 * @returns  {Object} - The aggregated status returned by sub-modules (if any) once they complete their loading.
	 *
	 * @summary  Loads sub-modules, if any.
	 *
	 * @description
	 * 1. Use the supplied {@link ConfigurationService} instance (if any), to get / store both configuration and state.
	 * +  Call the loader (typically, {@link TwyrModuleLoader#load}) to load sub-modules, if any.
	 */
	async load(configSrvc) {
		if(plntWrksEnv === 'development') console.log(`${this.name}::load`);

		try {
			let config = this.$config || {};
			if(configSrvc) config = await configSrvc.loadConfiguration(this);

			this.$config = config;
			this.$enabled = (this.$config.state === true);

			const subModuleStatus = await this.$loader.load(configSrvc);
			return subModuleStatus;
		}
		catch(err) {
			throw new TwyrBaseError(`${this.name}::load error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     initialize
	 *
	 * @returns  {Object} - The aggregated status returned by sub-modules (if any) once they complete their initialization.
	 *
	 * @summary  Initializes sub-modules, if any.
	 *
	 * @description
	 * Call the loader (typically, {@link TwyrModuleLoader#initialize}) to initialize sub-modules, if any.
	 */
	async initialize() {
		if(plntWrksEnv === 'development') console.log(`${this.name}::initialize`);

		try {
			const subModuleStatus = await this.$loader.initialize();
			return subModuleStatus;
		}
		catch(err) {
			throw new TwyrBaseError(`${this.name}::initialize error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     start
	 *
	 * @param    {Object} dependencies - Interfaces to {@link TwyrBaseService} instances that this module depends on.
	 *
	 * @returns  {Object} - The aggregated status returned by sub-modules (if any) once they complete their startup sequences.
	 *
	 * @summary  Starts sub-modules, if any.
	 *
	 * @description
	 * Call the loader (typically, {@link TwyrModuleLoader#start}) to start sub-modules, if any.
	 */
	async start(dependencies) {
		if(plntWrksEnv === 'development') console.log(`${this.name}::start`);

		try {
			this.$dependencies = dependencies;

			// First, set state to true so the module sets itself up
			const actualState = this.$enabled;
			this.$enabled = true;

			await this._setup();

			// Do the same for all of the sub-modules
			const subModuleStatus = await this.$loader.start(dependencies);

			// Now, set the actual state, if required
			if(!actualState) await this._changeState(actualState);

			return subModuleStatus;
		}
		catch(err) {
			throw new TwyrBaseError(`${this.name}::start error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     stop
	 *
	 * @returns  {Object} - The aggregated status returned by sub-modules (if any) once they complete their shutdown sequences.
	 *
	 * @summary  Stops sub-modules, if any.
	 *
	 * @description
	 * Call the loader (typically, {@link TwyrModuleLoader#stop}) to shutdown sub-modules, if any.
	 */
	async stop() {
		if(plntWrksEnv === 'development') console.log(`${this.name}::stop`);

		try {
			const subModuleStatus = await this.$loader.stop();
			await this._teardown();

			return subModuleStatus;
		}
		catch(err) {
			throw new TwyrBaseError(`${this.name}::stop error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     uninitialize
	 *
	 * @returns  {Object} - The aggregated status returned by sub-modules (if any) once they uninitialize themselves.
	 *
	 * @summary  Uninitializes sub-modules, if any.
	 *
	 * @description
	 * Call the loader (typically, {@link TwyrModuleLoader#uninitialize}) to uninitialize sub-modules, if any.
	 */
	async uninitialize() {
		if(plntWrksEnv === 'development') console.log(`${this.name}::uninitialize`);

		try {
			const subModuleStatus = await this.$loader.uninitialize();
			return subModuleStatus;
		}
		catch(err) {
			throw new TwyrBaseError(`${this.name}::uninitialize error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     unload
	 *
	 * @returns  {Object} - The aggregated status returned by sub-modules (if any) once they unload themselves.
	 *
	 * @summary  Unloads sub-modules, if any.
	 *
	 * @description
	 * Call the loader (typically, {@link TwyrModuleLoader#unload}) to unload sub-modules, if any.
	 */
	async unload() {
		if(plntWrksEnv === 'development') console.log(`${this.name}::unload`);

		try {
			const subModuleStatus = await this.$loader.unload();
			return subModuleStatus;
		}
		catch(err) {
			throw new TwyrBaseError(`${this.name}::unload error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     _setup
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  To be implemented by derived classes for setting themselves up.
	 */
	async _setup() {
		if(plntWrksEnv === 'development') console.log(`${this.name}::_setup`);
		return null;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     _teardown
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  To be implemented by derived classes for un-setting themselves down.
	 */
	async _teardown() {
		if(plntWrksEnv === 'development') console.log(`${this.name}::_teardown`);
		return null;
	}
	// #endregion

	// #region Configuration Change Handlers
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     _reconfigure
	 *
	 * @param    {Object} newConfig - The changed confoguration.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Changes the configuration of this module, and informs everyone interested.
	 */
	async _reconfigure(newConfig) {
		if(plntWrksEnv === 'development') console.log(`${this.name}::_reconfigure`);

		const deepEqual = require('deep-equal'),
			deepMerge = require('deepmerge');

		try {
			// Step 1: If the config has not changed, do nothing
			if(deepEqual(newConfig, this.$config))
				return null;

			// Step 2: If the module is currently disabled, store the config
			// and return
			if(!this.$enabled) {
				this.$config = deepMerge(this.$config, JSON.parse(JSON.stringify(newConfig)) || {});
				return null;
			}

			// Step 3: Config has changed, and the module is active
			// So recycle the module - teardown, copy config, and setup
			await this._teardown();
			this.$config = deepMerge(this.$config, JSON.parse(JSON.stringify(newConfig)) || {});
			await this._setup();

			// Step 4: Go up the hierarchy and let the parent modules react
			if(this.$parent) await this.$parent._subModuleReconfigure(this);

			// Step 5: Let the sub-modules know about the change in configuration
			[this.$services, this.$middlewares, this.$components, this.$templates].forEach((subModules) => {
				if(!subModules) return;

				Object.keys(subModules).forEach(async (subModuleName) => {
					const subModule = subModules[subModuleName];
					await subModule._parentReconfigure();
				});
			});

			// Step 6: Now that the entire hierarchy has been informed, let the modules
			// that depend on this one know about the state change
			if(!this.$dependants) return null;

			Object.keys(this.$dependants).forEach(async (dependantName) => {
				const dependant = this.$dependants[dependantName];
				await dependant._dependencyReconfigure(this);
			});

			return null;
		}
		catch(err) {
			throw new TwyrBaseError(`${this.name}::_reconfigure error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     _subModuleReconfigure
	 *
	 * @param    {TwyrBaseModule} subModule - The sub-module that changed configuration.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Lets the module know that one of its subModules changed configuration.
	 */
	async _subModuleReconfigure(subModule) {
		if(plntWrksEnv === 'development') console.log(`${this.name}::_subModuleReconfigure: ${subModule.name}`);
		return null;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     _parentReconfigure
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Lets the module know that its parent changed configuration.
	 */
	async _parentReconfigure() {
		if(plntWrksEnv === 'development') console.log(`${this.name}::_parentReconfigure: ${this.$parent.name}`);
		return null;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     _dependencyReconfigure
	 *
	 * @param    {TwyrBaseModule} dependency - The dependency that changed configuration.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Lets the module know that one of its dependencies changed configuration.
	 */
	async _dependencyReconfigure(dependency) {
		if(plntWrksEnv === 'development') console.log(`${this.name}::_dependencyReconfigure: ${dependency.name}`);
		return null;
	}
	// #endregion

	// #region State Change Handlers
	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     _changeState
	 *
	 * @param    {Object} newState - The next state of this module.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Enables / disables this module, and all its sub-modules (if any).
	 */
	async _changeState(newState) {
		if(this.$enabled === newState)
			return null;

		if(plntWrksEnv === 'development') console.log(`${this.name}::_changeState`);

		try {
			// Step 1: Go up the hierarcy and let the parent modules reset themselves
			if(this.$parent) await this.$parent._subModuleChangeState(this, newState);

			// Step 2: Let the sub-modules know about the change in state
			[this.$services, this.$middlewares, this.$components, this.$templates].forEach((subModules) => {
				if(!subModules) return;

				Object.keys(subModules).forEach(async (subModuleName) => {
					const subModule = subModules[subModuleName];
					await subModule._parentStateChange(newState);
				});
			});

			// Step 3: Now that the entire hierarchy has changed state, let the modules
			// that depend on this one know about the state change
			if(!this.$dependants) return null;

			Object.keys(this.$dependants).forEach(async (dependantName) => {
				const dependant = this.$dependants[dependantName];
				await dependant._dependencyStateChange(this, newState);
			});

			return null;
		}
		catch(err) {
			throw new TwyrBaseError(`${this.name}::_changeState error`, err);
		}
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     _subModuleChangeState
	 *
	 * @param    {TwyrBaseModule} subModule - The sub-module that changed state.
	 * @param    {Object} newState - The next state of the sub-module.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Lets the module know that one of its subModules changed state.
	 */
	async _subModuleChangeState(subModule, newState) {
		if(plntWrksEnv === 'development') console.log(`${this.name}::_subModuleChangeState::${subModule.name}: ${newState}`);
		return null;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     _parentChangeState
	 *
	 * @param    {Object} newState - The next state of the parent module.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Lets the module know that its parent changed state.
	 */
	async _parentChangeState(newState) {
		if(plntWrksEnv === 'development') console.log(`${this.name}::_parentChangeState::${this.$parent.name}: ${newState}`);
		await this._changeState(newState);

		return null;
	}

	/**
	 * @async
	 * @function
	 * @instance
	 * @memberof TwyrBaseModule
	 * @name     _dependencyStateChange
	 *
	 * @param    {TwyrBaseModule} dependency - The dependency that changed state.
	 * @param    {Object} newState - The next state of the dependency.
	 *
	 * @returns  {undefined} Nothing.
	 *
	 * @summary  Lets the module know that one of its dependencies changed state.
	 */
	async _dependencyStateChange(dependency, newState) {
		if(plntWrksEnv === 'development') console.log(`${this.name}::_dependencyChangeState::${dependency.name}: ${newState}`);
		if(!this.$dependencies) return null;

		// Since dependencies return thir interface only if they are enabled, this is a good way
		// to switch this module to enabled/disabled state - irrespective of the actual newState.
		let allDependenciesEnabled = true;
		Object.keys(this.$dependencies).forEach((dependencyName) => {
			allDependenciesEnabled = allDependenciesEnabled && this.$dependencies[dependencyName];
		});

		await this._changeState(allDependenciesEnabled);
		return null;
	}
	// #endregion

	// #region Properties
	/**
	 * @member   {Object} dependencies
	 * @instance
	 * @memberof TwyrBaseModule
	 *
	 * @readonly
	 */
	get dependencies() {
		return [].concat(super.dependencies || []);
	}

	/**
	 * @override
	 */
	get basePath() {
		return __dirname;
	}
	// #endregion
}

exports.TwyrBaseModule = TwyrBaseModule;
