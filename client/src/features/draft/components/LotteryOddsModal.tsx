import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface LotteryProbability {
    teamName: string;
    winPct: number;
    projectedRank: number;
    probability: number;
}

interface LotteryOddsModalProps {
    isOpen: boolean;
    onClose: () => void;
    odds: LotteryProbability[];
}

export function LotteryOddsModal({ isOpen, onClose, odds }: LotteryOddsModalProps) {
    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-900/75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 border border-white/10">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-transparent text-gray-400 hover:text-gray-200 focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                                <div>
                                    <div className="mt-3 text-center sm:mt-0 sm:text-left">
                                        <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-white mb-4">
                                            Lottery Probabilities
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-700">
                                                    <thead className="bg-gray-700/50">
                                                        <tr>
                                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-200 sm:pl-6">Team</th>
                                                            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-200">Proj. Rank</th>
                                                            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-200">Odds</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-700 bg-gray-800">
                                                        {odds.map((team) => (
                                                            <tr key={team.teamName}>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">
                                                                    {team.teamName}
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 text-center">
                                                                    {team.projectedRank}
                                                                </td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-emerald-400 font-bold text-right">
                                                                    {(team.probability * 100).toFixed(1)}%
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
