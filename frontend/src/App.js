import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import 'react-bootstrap-table2-paginator/dist/react-bootstrap-table2-paginator.min.css';
import React from 'react';
import axios from 'axios';
import {
  Container,
  Toast,
  Row,
  Col,
  Button,
  Spinner,
  Accordion,
  Card,
} from 'react-bootstrap';
import { ChevronUp, ChevronDown } from 'react-bootstrap-icons';
import BootstrapTable from 'react-bootstrap-table-next';
import paginationFactory from 'react-bootstrap-table2-paginator';

// Define columns here
// dataField should be the name of the desired field as specified by the API
const columns = [
  {
    dataField: 'name',
    text: 'Name',
  },
  {
    dataField: 'street_line_1',
    text: 'Street Address',
  },
  {
    dataField: 'city',
    text: 'City',
  },
  {
    dataField: 'zip_code',
    text: 'Zipcode',
  },
  {
    dataField: 'profession',
    text: 'Profession'
  },
  {
    dataField: 'employer_name',
    text: 'Employer'
  }
];

const selectRowCheck = {
  mode: 'checkbox',
  clickToSelect: true, // enables clicking the row to select the item
};

const selectRowRadio = {
  mode: 'radio',
  clickToSelect: true, // enables clicking the row to select the item
};

const paginationOpts = {
  sizePerPage: 25,
  sizePerPageList: [
    {
      text: '10',
      value: 10,
    },
    {
      text: '25',
      value: 25,
    },
    {
      text: '50',
      value: 25,
    },
    {
      text: '100',
      value: 100,
    },
  ],
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      matchCount: localStorage.getItem('matchCount') ? parseInt(localStorage.getItem('matchCount')) : 0, // Count of how many matches the user has made, saved in local browser storage
      recordCount: localStorage.getItem('recordCount') ? parseInt(localStorage.getItem('recordCount')) : 0, // Count of how many total records the user has cleaned, saved in local storage
      rawContributions: [], // Stores the raw contributions, retrieved from API endpoint
      cleanContributions: [], // Stores the contributors that have already been cleaned, retrieved from API endpoint
      rawTableOpen: true, // Open/close state of the raw table accordion
      cleanTableOpen: true, // Open/close state of the contributors accordion
      showToast: false, // Show status of the alert toast
      toastTitle: '', // Title of the alert toast
      toastBody: '', // Body of the alert toast
      loading: true, // True when waiting for response from API endpoint
    };
  }

  // gets the uuids from the selected rows and sends a POST request to the API
  submitData = () => {
    const uuids = this.rawTable.selectionContext.selected; // we bind this.rawTable in the ref attribute of the BootstrapTable element below
    // the user must select at least one raw contribution to submit
    if (uuids.length === 0) {
      this.setState({
        showToast: true,
        toastTitle: 'No selection made',
        toastBody: 'Please select at least one entry before pressing submit.',
      });
    } else {
      const contributorIDs =
        (this.cleanTable &&
        this.cleanTable.selectionContext &&
        this.cleanTable.selectionContext.selected &&
        this.cleanTable.selectionContext.selected)
          ? this.cleanTable.selectionContext.selected
          : []; // we bind this.cleanTable in the ref attribute of the BootstrapTable element below
      // if existing contributors are found, then the user must make a selection
      if (this.state.cleanContributions.length > 1 && contributorIDs.length < 1) {
        this.setState({
          showModal: true,
          modalTitle: 'No existing contributor selected',
          modalBody: 'Please select one existing contributor or "New contributor".',
        });
      }
      // the user may only select one existing contributor into which to merge matching raw contributions
      else if (contributorIDs.length > 1) {
        this.setState({
          showToast: true,
          toastTitle: 'More than one existing contributor selected',
          toastBody: 'Please select at most one existing contributor.',
        });
      } else {
        const payload = {
          data: uuids,
          // if no selection or null selection, create new contributor
          contributorID:
            contributorIDs.length > 0 && contributorIDs[0]
              ? contributorIDs[0]
              : '',
        };
        axios
          .post('/api/contributions/clean', payload)
          .then((response) => {
            this.setState({
              matchCount: this.state.matchCount + 1,
              recordCount: this.state.recordCount + uuids.length,
              showToast: true,
              toastTitle: 'Success',
              toastBody: 'Your submission has been processed successfully!',
            });
            // Saving new progress counters to local browser storage
            localStorage.setItem('matchCount', this.state.matchCount);
            localStorage.setItem('recordCount', this.state.recordCount);
            this.getContributions();
          })
          .catch((error) => {
            this.setState({
              showToast: true,
              toastTitle: 'Error',
              toastBody:
                'There was an error with your submission. Please try again later or refresh for a new set of contributions.',
            });
          });
      }
    }
  };

  // makes a request to get a set of matched contributions and updates the state
  getContributions = async () => {
    this.setState({
      loading: true,
    });
    axios
      .get('/api/contributions/raw')
      .then((response) => {
        this.setState({
          rawContributions: response.data.data.raw,
          cleanContributions: response.data.data.clean.concat([
            { id: null, name: 'New contributor' },
          ]),
          loading: false,
        });
      })
      // if there's an error, just clear the tables
      // we don't show an error message in the toast because, it overwrites the success message if a volunteer cleans the last record in the database
      .catch((error) => {
        this.setState({
          rawContributions: [],
          cleanContributions: [],
          loading: false,
        });
      });
  };

  componentDidMount() {
    this.getContributions();
  }

  render() {
    return (
      <Container fluid>
        <Row>
          <Col md={2}>
            <Card className="progressCard">
              <Card.Body>
                <Card.Title>Your Progress</Card.Title>
                <Card.Text>
                  <p>Matches submitted: { this.state.matchCount }</p>
                  <p>Records cleaned: { this.state.recordCount }</p>
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={8}>
            <Row>
              <Col>
                <h1 className="text-center">Campaign Finance Data Cleaning</h1>
              </Col>
            </Row>
            <Row>
              <Col>
                <h2>Matches Found</h2>
                <p>Select all contributions that come from the same contributor.</p>
              </Col>
            </Row>
            <Row>
              <Accordion defaultActiveKey="0" style={{ width: '100%' }}>
                <Card>
                  <Accordion.Toggle
                    as={Card.Header}
                    eventKey="0"
                    onClick={() =>
                      this.setState({ rawTableOpen: !this.state.rawTableOpen })
                    }
                  >
                    Raw Contributions Table
                    {this.state.rawTableOpen ? (
                      <ChevronUp className="float-right"></ChevronUp>
                    ) : (
                      <ChevronDown className="float-right"></ChevronDown>
                    )}
                  </Accordion.Toggle>
                  <Accordion.Collapse eventKey="0">
                    <Card.Body>
                      {this.state.loading ? (
                        <Col className="text-center">
                          <Spinner
                            animation="border"
                            variant="primary"
                            role="status"
                          >
                            <span className="sr-only">Loading...</span>
                          </Spinner>
                        </Col>
                      ) : (
                        <Col>
                          <BootstrapTable
                            ref={(t) => (this.rawTable = t)}
                            keyField="id"
                            data={this.state.rawContributions}
                            columns={columns}
                            selectRow={selectRowCheck}
                            pagination={paginationFactory(paginationOpts)}
                          />
                        </Col>
                      )}
                    </Card.Body>
                  </Accordion.Collapse>
                </Card>
              </Accordion>
            </Row>
            {this.state.cleanContributions &&
              this.state.cleanContributions.length > 1 && (
                <div>
                  <Row className="mt-3">
                    <Col>
                      <h2>Existing Contributors Found</h2>
                      <p>
                        We found similar contributors with records that have already
                        been processed. Select the contributor that matches the
                        records above, or select "New Contributor" if there is no
                        match. If you don't select any option, a new contributor
                        will be created.
                      </p>
                    </Col>
                  </Row>
                  <Row>
                    <Accordion defaultActiveKey="0" style={{ width: '100%' }}>
                      <Card>
                        <Accordion.Toggle
                          as={Card.Header}
                          eventKey="0"
                          onClick={() =>
                            this.setState({
                              cleanTableOpen: !this.state.cleanTableOpen,
                            })
                          }
                        >
                          Existing Contributors Table
                          {this.state.cleanTableOpen ? (
                            <ChevronUp className="float-right"></ChevronUp>
                          ) : (
                            <ChevronDown className="float-right"></ChevronDown>
                          )}
                        </Accordion.Toggle>
                        <Accordion.Collapse eventKey="0">
                          <Card.Body>
                            {this.state.loading ? (
                              <Col className="text-center">
                                <Spinner
                                  animation="border"
                                  variant="primary"
                                  role="status"
                                >
                                  <span className="sr-only">Loading...</span>
                                </Spinner>
                              </Col>
                            ) : (
                              <Col>
                                <BootstrapTable
                                  ref={(t) => (this.cleanTable = t)}
                                  keyField="id"
                                  data={this.state.cleanContributions}
                                  columns={columns}
                                  selectRow={selectRowRadio}
                                  pagination={paginationFactory(paginationOpts)}
                                />
                              </Col>
                            )}
                          </Card.Body>
                        </Accordion.Collapse>
                      </Card>
                    </Accordion>
                  </Row>
                </div>
              )}
            <Row className="mt-2">
              <Col>
                {!this.state.loading && (
                  <Button
                    className="float-right"
                    variant="primary"
                    onClick={this.submitData}
                  >
                    Submit
                  </Button>
                )}
              </Col>
            </Row>
          </Col>
          <Col>
            <Toast className="alertToast" onClose={() => this.setState({ showToast: false })} show={this.state.showToast} delay={8000} autohide>
              <Toast.Header>
                <strong className="mr-auto">{this.state.toastTitle}</strong>
              </Toast.Header>
              <Toast.Body>{this.state.toastBody}</Toast.Body>
            </Toast>
          </Col>
        </Row>  
      </Container>
    );
  }
}

export default App;
