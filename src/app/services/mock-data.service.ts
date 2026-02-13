// import { Injectable } from '@angular/core';
// import { Observable, of } from 'rxjs';

// @Injectable({
//   providedIn: 'root'
// })
// export class MockDataService {

//   constructor() { }

//   getDatasets(): Observable<any[]> {
//     const mockDatasets = [
//       {
//         dataset_id: 1269,
//         dataset_name: "NetSim-sim6-32",
//         created_time: "2024-10-21T22:43:17.824703",
//         min_row_count: 10,
//         max_row_count: 1200,
//         min_column_count: 10,
//         max_column_count: 11,
//         dataset_version_info_list: [
//           {
//             dataset: {
//               dataset_id: 1269,
//               dataset_version: null,
//               dataset_name: "NetSim-sim6-32",
//               dataset_description: "NetSim simulation dataset with 6 variables and 32 samples",
//               author: "NetSim Team",
//               visibility: "public",
//               url: "https://example.com/netsim-sim6-32",
//               timestamp: "2024-10-21T22:43:17.824703"
//             },
//             version: {
//               dataset_version_id: 1269,
//               version_number: 1,
//               max_row_count: 1200,
//               min_row_count: 10,
//               max_column_count: 11,
//               min_column_count: 10
//             }
//           }
//         ]
//       },
//       {
//         dataset_id: 652,
//         dataset_name: "Sachs",
//         created_time: "2024-10-21T20:19:28.729787",
//         min_row_count: 100,
//         max_row_count: 1000,
//         min_column_count: 8,
//         max_column_count: 11,
//         dataset_version_info_list: [
//           {
//             dataset: {
//               dataset_id: 652,
//               dataset_version: null,
//               dataset_name: "Sachs",
//               dataset_description: "Sachs protein signaling network dataset",
//               author: "Sachs Research Group",
//               visibility: "public",
//               url: "https://example.com/sachs",
//               timestamp: "2024-10-21T20:19:28.729787"
//             },
//             version: {
//               dataset_version_id: 652,
//               version_number: 1,
//               max_row_count: 1000,
//               min_row_count: 100,
//               max_column_count: 11,
//               min_column_count: 8
//             }
//           }
//         ]
//       },
//       {
//         dataset_id: 273,
//         dataset_name: "Alarm",
//         created_time: "2024-10-21T18:15:42.123456",
//         min_row_count: 50,
//         max_row_count: 500,
//         min_column_count: 12,
//         max_column_count: 37,
//         dataset_version_info_list: [
//           {
//             dataset: {
//               dataset_id: 273,
//               dataset_version: null,
//               dataset_name: "Alarm",
//               dataset_description: "ALARM monitoring system dataset",
//               author: "Alarm Systems Inc",
//               visibility: "public",
//               url: "https://example.com/alarm",
//               timestamp: "2024-10-21T18:15:42.123456"
//             },
//             version: {
//               dataset_version_id: 273,
//               version_number: 1,
//               max_row_count: 500,
//               min_row_count: 50,
//               max_column_count: 37,
//               min_column_count: 12
//             }
//           }
//         ]
//       },
//       {
//         dataset_id: 891,
//         dataset_name: "Asia",
//         created_time: "2024-10-21T16:30:15.987654",
//         min_row_count: 20,
//         max_row_count: 200,
//         min_column_count: 8,
//         max_column_count: 8,
//         dataset_version_info_list: [
//           {
//             dataset: {
//               dataset_id: 891,
//               dataset_version: null,
//               dataset_name: "Asia",
//               dataset_description: "Asia lung cancer dataset",
//               author: "Medical Research Institute",
//               visibility: "public",
//               url: "https://example.com/asia",
//               timestamp: "2024-10-21T16:30:15.987654"
//             },
//             version: {
//               dataset_version_id: 891,
//               version_number: 1,
//               max_row_count: 200,
//               min_row_count: 20,
//               max_column_count: 8,
//               min_column_count: 8
//             }
//           }
//         ]
//       },
//       {
//         dataset_id: 445,
//         dataset_name: "Child",
//         created_time: "2024-10-21T14:45:33.456789",
//         min_row_count: 30,
//         max_row_count: 300,
//         min_column_count: 10,
//         max_column_count: 20,
//         dataset_version_info_list: [
//           {
//             dataset: {
//               dataset_id: 445,
//               dataset_version: null,
//               dataset_name: "Child",
//               dataset_description: "Child development dataset",
//               author: "Child Development Center",
//               visibility: "public",
//               url: "https://example.com/child",
//               timestamp: "2024-10-21T14:45:33.456789"
//             },
//             version: {
//               dataset_version_id: 445,
//               version_number: 1,
//               max_row_count: 300,
//               min_row_count: 30,
//               max_column_count: 20,
//               min_column_count: 10
//             }
//           }
//         ]
//       }
//     ];
//     return of(mockDatasets);
//   }

//   getModels(): Observable<any[]> {
//     const mockModels = [
//       {
//         modl_id: 2,
//         modl_name: "ges",
//         created_time: "2024-10-21T20:19:28.729787",
//         min_likes_count: 0,
//         min_downloads_count: 2,
//         max_likes_count: 0,
//         max_downloads_count: 56,
//         min_runs_count: 0,
//         max_runs_count: 160,
//         modl_version_info_list: [
//           {
//             modl: {
//               modl_id: 2,
//               modl_version: null,
//               modl_name: "ges",
//               modl_description: "Greedy Equivalence Search algorithm",
//               author: "GES Research Team",
//               visibility: "public",
//               url: "https://example.com/ges",
//               timestamp: "2024-10-21T20:19:28.729787"
//             },
//             version: {
//               modl_version_id: 2,
//               version_number: 1,
//               parameters: [
//                 {
//                   parameter_id: 1,
//                   parameter_name: "alpha",
//                   parameter_description: "Significance level for independence tests",
//                   hyperparameter_value: "0.05",
//                   parameter_type: "float"
//                 },
//                 {
//                   parameter_id: 2,
//                   parameter_name: "max_k",
//                   parameter_description: "Maximum size of conditioning set",
//                   hyperparameter_value: "3",
//                   parameter_type: "integer"
//                 }
//               ],
//               tasks: [
//                 {
//                   task_id: 2,
//                   task_name: "discovery.static"
//                 }
//               ]
//             }
//           }
//         ]
//       },
//       {
//         modl_id: 5,
//         modl_name: "pc",
//         created_time: "2024-10-21T19:30:15.123456",
//         min_likes_count: 0,
//         min_downloads_count: 5,
//         max_likes_count: 0,
//         max_downloads_count: 45,
//         min_runs_count: 0,
//         max_runs_count: 120,
//         modl_version_info_list: [
//           {
//             modl: {
//               modl_id: 5,
//               modl_version: null,
//               modl_name: "pc",
//               modl_description: "PC (Peter-Clark) algorithm for causal discovery",
//               author: "PC Algorithm Team",
//               visibility: "public",
//               url: "https://example.com/pc",
//               timestamp: "2024-10-21T19:30:15.123456"
//             },
//             version: {
//               modl_version_id: 5,
//               version_number: 1,
//               parameters: [
//                 {
//                   parameter_id: 3,
//                   parameter_name: "alpha",
//                   parameter_description: "Significance level for independence tests",
//                   hyperparameter_value: "0.01",
//                   parameter_type: "float"
//                 },
//                 {
//                   parameter_id: 4,
//                   parameter_name: "max_k",
//                   parameter_description: "Maximum size of conditioning set",
//                   hyperparameter_value: "4",
//                   parameter_type: "integer"
//                 }
//               ],
//               tasks: [
//                 {
//                   task_id: 2,
//                   task_name: "discovery.static"
//                 }
//               ]
//             }
//           }
//         ]
//       },
//       {
//         modl_id: 8,
//         modl_name: "fges",
//         created_time: "2024-10-21T18:45:22.654321",
//         min_likes_count: 0,
//         min_downloads_count: 3,
//         max_likes_count: 0,
//         max_downloads_count: 38,
//         min_runs_count: 0,
//         max_runs_count: 95,
//         modl_version_info_list: [
//           {
//             modl: {
//               modl_id: 8,
//               modl_version: null,
//               modl_name: "fges",
//               modl_description: "Fast Greedy Equivalence Search algorithm",
//               author: "FGES Research Team",
//               visibility: "public",
//               url: "https://example.com/fges",
//               timestamp: "2024-10-21T18:45:22.654321"
//             },
//             version: {
//               modl_version_id: 8,
//               version_number: 1,
//               parameters: [],
//               tasks: [
//                 {
//                   task_id: 2,
//                   task_name: "discovery.static"
//                 }
//               ]
//             }
//           }
//         ]
//       },
//       {
//         modl_id: 12,
//         modl_name: "lingam",
//         created_time: "2024-10-21T17:20:10.789123",
//         min_likes_count: 0,
//         min_downloads_count: 1,
//         max_likes_count: 0,
//         max_downloads_count: 25,
//         min_runs_count: 0,
//         max_runs_count: 75,
//         modl_version_info_list: [
//           {
//             modl: {
//               modl_id: 12,
//               modl_version: null,
//               modl_name: "lingam",
//               modl_description: "LiNGAM algorithm for non-Gaussian data",
//               author: "LiNGAM Research Group",
//               visibility: "public",
//               url: "https://example.com/lingam",
//               timestamp: "2024-10-21T17:20:10.789123"
//             },
//             version: {
//               modl_version_id: 12,
//               version_number: 1,
//               parameters: [],
//               tasks: [
//                 {
//                   task_id: 2,
//                   task_name: "discovery.static"
//                 }
//               ]
//             }
//           }
//         ]
//       },
//       {
//         modl_id: 15,
//         modl_name: "causal_forest",
//         created_time: "2024-10-21T16:10:45.321654",
//         min_likes_count: 0,
//         min_downloads_count: 4,
//         max_likes_count: 0,
//         max_downloads_count: 32,
//         min_runs_count: 0,
//         max_runs_count: 60,
//         modl_version_info_list: [
//           {
//             modl: {
//               modl_id: 15,
//               modl_version: null,
//               modl_name: "causal_forest",
//               modl_description: "Causal Forest algorithm for heterogeneous treatment effects",
//               author: "Causal Forest Team",
//               visibility: "public",
//               url: "https://example.com/causal_forest",
//               timestamp: "2024-10-21T16:10:45.321654"
//             },
//             version: {
//               modl_version_id: 15,
//               version_number: 1,
//               parameters: [],
//               tasks: [
//                 {
//                   task_id: 2,
//                   task_name: "discovery.static"
//                 }
//               ]
//             }
//           }
//         ]
//       }
//     ];
//     return of(mockModels);
//   }

//   getMetrics(): Observable<any[]> {
//     const mockMetrics = [
//       {
//         metric_id: 10,
//         metric_name: "SHD_temporal",
//         created_time: "2024-10-21T20:20:36.457141",
//         min_likes_count: 0,
//         min_downloads_count: 37,
//         max_likes_count: 0,
//         max_downloads_count: 77,
//         min_runs_count: 32,
//         max_runs_count: 746,
//         metric_version_info_list: [
//           {
//             metric: {
//               metric_id: 10,
//               metric_version: null,
//               metric_name: "SHD_temporal",
//               metric_description: "Structural Hamming Distance for temporal data",
//               author: "Temporal Metrics Team",
//               visibility: "public",
//               url: "https://example.com/shd_temporal",
//               timestamp: "2024-10-21T20:20:36.457141"
//             },
//             version: {
//               metric_version_id: 10,
//               version_number: 1,
//               input_type: "",
//               output_type: "",
//               tasks: [
//                 {
//                   task_id: 10,
//                   task_name: "discovery.temporal"
//                 }
//               ]
//             }
//           }
//         ]
//       },
//       {
//         metric_id: 9,
//         metric_name: "SHD_static",
//         created_time: "2024-10-21T19:15:25.123789",
//         min_likes_count: 0,
//         min_downloads_count: 28,
//         max_likes_count: 0,
//         max_downloads_count: 65,
//         min_runs_count: 25,
//         max_runs_count: 580,
//         metric_version_info_list: [
//           {
//             metric: {
//               metric_id: 9,
//               metric_version: null,
//               metric_name: "SHD_static",
//               metric_description: "Structural Hamming Distance for static data",
//               author: "Static Metrics Team",
//               visibility: "public",
//               url: "https://example.com/shd_static",
//               timestamp: "2024-10-21T19:15:25.123789"
//             },
//             version: {
//               metric_version_id: 9,
//               version_number: 1,
//               input_type: "",
//               output_type: "",
//               tasks: [
//                 {
//                   task_id: 2,
//                   task_name: "discovery.static"
//                 }
//               ]
//             }
//           }
//         ]
//       },
//       {
//         metric_id: 7,
//         metric_name: "F1_score",
//         created_time: "2024-10-21T18:30:18.456123",
//         min_likes_count: 0,
//         min_downloads_count: 35,
//         max_likes_count: 0,
//         max_downloads_count: 72,
//         min_runs_count: 30,
//         max_runs_count: 420,
//         metric_version_info_list: [
//           {
//             metric: {
//               metric_id: 7,
//               metric_version: null,
//               metric_name: "F1_score",
//               metric_description: "F1 score for edge prediction accuracy",
//               author: "Evaluation Metrics Team",
//               visibility: "public",
//               url: "https://example.com/f1_score",
//               timestamp: "2024-10-21T18:30:18.456123"
//             },
//             version: {
//               metric_version_id: 7,
//               version_number: 1,
//               input_type: "",
//               output_type: "",
//               parameters: [
//                 {
//                   parameter_id: 5,
//                   parameter_name: "beta",
//                   parameter_description: "Beta parameter for F1 score calculation",
//                   hyperparameter_value: "1.0",
//                   parameter_type: "float"
//                 },
//                 {
//                   parameter_id: 6,
//                   parameter_name: "threshold",
//                   parameter_description: "Threshold for positive prediction",
//                   hyperparameter_value: "0.5",
//                   parameter_type: "float"
//                 }
//               ],
//               tasks: [
//                 {
//                   task_id: 2,
//                   task_name: "discovery.static"
//                 }
//               ]
//             }
//           }
//         ]
//       },
//       {
//         metric_id: 5,
//         metric_name: "Precision",
//         created_time: "2024-10-21T17:45:12.789456",
//         min_likes_count: 0,
//         min_downloads_count: 22,
//         max_likes_count: 0,
//         max_downloads_count: 48,
//         min_runs_count: 18,
//         max_runs_count: 320,
//         metric_version_info_list: [
//           {
//             metric: {
//               metric_id: 5,
//               metric_version: null,
//               metric_name: "Precision",
//               metric_description: "Precision for edge prediction",
//               author: "Precision Metrics Team",
//               visibility: "public",
//               url: "https://example.com/precision",
//               timestamp: "2024-10-21T17:45:12.789456"
//             },
//             version: {
//               metric_version_id: 5,
//               version_number: 1,
//               input_type: "",
//               output_type: "",
//               tasks: [
//                 {
//                   task_id: 2,
//                   task_name: "discovery.static"
//                 }
//               ]
//             }
//           }
//         ]
//       },
//       {
//         metric_id: 3,
//         metric_name: "Recall",
//         created_time: "2024-10-21T16:55:33.654789",
//         min_likes_count: 0,
//         min_downloads_count: 19,
//         max_likes_count: 0,
//         max_downloads_count: 41,
//         min_runs_count: 15,
//         max_runs_count: 280,
//         metric_version_info_list: [
//           {
//             metric: {
//               metric_id: 3,
//               metric_version: null,
//               metric_name: "Recall",
//               metric_description: "Recall for edge prediction",
//               author: "Recall Metrics Team",
//               visibility: "public",
//               url: "https://example.com/recall",
//               timestamp: "2024-10-21T16:55:33.654789"
//             },
//             version: {
//               metric_version_id: 3,
//               version_number: 1,
//               input_type: "",
//               output_type: "",
//               tasks: [
//                 {
//                   task_id: 2,
//                   task_name: "discovery.static"
//                 }
//               ]
//             }
//           }
//         ]
//       }
//     ];
//     return of(mockMetrics);
//   }
// } 