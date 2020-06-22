import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import 'react-bootstrap-table2-paginator/dist/react-bootstrap-table2-paginator.min.css';
import React from 'react';
import axios from 'axios';
import {
  Container,
  Row,
  Col,
  Button,
  Modal,
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
      rawContributions: [],
      cleanContributions: [],
      rawTableOpen: true,
      cleanTableOpen: true,
      showModal: false,
      modalTitle: '',
      modalBody: '',
      loading: true,
    };
  }

  // gets the uuids from the selected rows and sends a POST request to the API
  submitData = () => {
    const uuids = this.rawTable.selectionContext.selected; // we bind this.rawTable in the ref attribute of the BootstrapTable element below
    // the user must select at least one raw contribution to submit
    if (uuids.length === 0) {
      this.setState({
        showModal: true,
        modalTitle: 'No selection made',
        modalBody: 'Please select at least one entry before pressing submit.',
      });
    } else {
      const contributorIDs =
        (this.cleanTable &&
        this.cleanTable.selectionContext &&
        this.cleanTable.selectionContext.selected &&
        this.cleanTable.selectionContext.selected)
          ? this.cleanTable.selectionContext.selected
          : []; // we bind this.cleanTable in the ref attribute of the BootstrapTable element below
      // the user may only select one existing contributor into which to merge matching raw contributions
      if (contributorIDs.length > 1) {
        this.setState({
          showModal: true,
          modalTitle: 'More than one existing contributor selected',
          modalBody: 'Please select at most one existing contributor.',
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
              showModal: true,
              modalTitle: 'Success',
              modalBody: 'Your submission has been processed successfully!',
            });
            this.getContributions();
          })
          .catch((error) => {
            this.setState({
              showModal: true,
              modalTitle: 'Error',
              modalBody:
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
      // we don't show an error message in the modal because, it overwrites the success message if a volunteer cleans the last record in the database
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
      <Container>
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
        {this.state.cleanContributions && this.state.cleanContributions.length > 1 ? (
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
        ) : (
          <Row className="mt-3">
            <Col>
              <h2>No Existing Contributors Found</h2>
              <p>
                Hit submit to create a new contributor based on your selection above.
              </p>
            </Col>
          </Row>
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
        <Modal
          show={this.state.showModal}
          onHide={() => this.setState({ showModal: false })}
        >
          <Modal.Header closeButton>
            <Modal.Title>{this.state.modalTitle}</Modal.Title>
          </Modal.Header>
          <Modal.Body>{this.state.modalBody}</Modal.Body>
          <Modal.Footer>
            <Button
              variant="primary"
              onClick={() => this.setState({ showModal: false })}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    );
  }
}

export default App;
