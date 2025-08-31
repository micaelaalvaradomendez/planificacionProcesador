
import { writable } from 'svelte/store';
import { getInitialSimulationState } from '$lib/application/usecases/simulationState';

export const simState = writable(getInitialSimulationState());
